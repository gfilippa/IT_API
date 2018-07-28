const crypt = require('crypt3/sync')
const crypto = require('crypto')
const async = require('async')
const filter = require('ldap-filters')
const text2png = require('text2png')
const _ = require('lodash')

const functionsUser = require('../functionsUser')
const mailTexts = require('./../../../configs/mailText')
const config = require('../../../configs/config')
const database = require('../../../configs/database')
const ApplicationErrorClass = require('../../applicationErrorClass')

const INTEGER_FIELDS = require('./../../../configs/ldap').INTEGER_FIELDS

function deleteResetToken (token) {
  return new Promise(
    function (resolve, reject) {
      database.UserPassReset.findOneAndRemove({token: token}).exec(function (err) {
        if (err) {
          reject(new ApplicationErrorClass(null, null, 56, err, 'Υπήρχε σφάλμα κατα την εύρεση token.', null, 500))
        } else {
          resolve()
        }
      })
    })
}

function passwordsAreDifferent (password1, password2) {
  return password1 !== password2
}

function passwordsAreSame (password1, password2) {
  return !passwordsAreDifferent(password1, password2)
}

function newPasswordExistsInHistory (user, password) {
  let passwordExistsInHistory = false
  if (!(user.pwdHistory instanceof Array)) { //make it function
    let tmphis = user.pwdHistory
    user.pwdHistory = []
    user.pwdHistory.push(tmphis)
  }

  user.pwdHistory.forEach(function (pwd) {
    try {
      let oldSaltFinal = pwd.match(/\$.\$.+\$/g)[0].slice(0, -1)
      let hash = crypt(password, oldSaltFinal)
      if ('{CRYPT}' + hash === pwd.split('#')[3]) {
        passwordExistsInHistory = true
      }
    } catch (err) {
      return false
    }
  })
  return passwordExistsInHistory
}

function oldPassIsCorrect (user, oldPassword) {
  let oldPassVerifies = false
  try {
    let currentSalt = user.userPassword.match(/\$.\$.+\$/g)[0].slice(0, -1)
    let currentHash = crypt(oldPassword, currentSalt)
    if ('{CRYPT}' + currentHash === user.userPassword)
      oldPassVerifies = true
  }
  catch (err) {
    return false
  }
  return oldPassVerifies
}

function sendEmailToken (mailToken) {
  return new Promise(
    function (resolve, reject) {
      config.MAIL.sendMail(mailToken, (err, info) => {
        if (err) {
          reject(new ApplicationErrorClass(null, null, 57, err, 'Συνέβη κάποιο σφάλμα κατα την αποστολή email.', null, 500))
        } else {
          resolve()
        }
      })
    })
}

function buildEmailToken (user, token) {
  let bodyText = mailTexts.resetMailText['el'](token, user.uid, config.WEB_BASE_URL.url)
  let subject = mailTexts.resetMailSubject['el'].normalUser
  if (user.scope > 1) {
    subject = mailTexts.resetMailSubject['el'].privUser
  }
  return {
    from: mailTexts.resetMailFrom.el, // sender address
    to: user.mail, // list of receivers
    subject: subject, // Subject line
    html: bodyText // html body
  }
}

function validateIputForReset (user, resetMail) {
  return (user.dn && user.mail === resetMail)
}

function buildTokenAndMakeEntryForReset (user) {
  return new Promise(
    function (resolve, reject) {
      let token = crypto.randomBytes(45).toString('hex') //maybe make a func to build token
      let tmpResetRequest = new database.UserPassReset({
        uid: user.uid,
        dn: user.dn,
        mail: user.mail,
        token: token
      })
      tmpResetRequest.save(function (err, user) {
        if (err) {
          reject(new ApplicationErrorClass(null, null, 58, err, 'Συνέβη κάποιο σφάλμα κατα την δημιουργία token', null, 500))
        } else {
          resolve(token)
        }
      })
    })
}

function searchUsersOnLDAP (ldapMain, opts) {
  return new Promise(
    function (resolve, reject) {
      ldapMain.search(config.LDAP[process.env.NODE_ENV].baseUserDN, opts, function (err, results) {
        if (err) {
          reject(err)
        } else {
          let usersArray = []
          let userCounter = 0
          results.on('searchEntry', function (user) {
            addUserToArray(user.object, userCounter++, usersArray)
          })
          results.on('error', function (err) {
            (err.code === 4) ? resolve(usersArray) : reject()
          })
          results.on('end', function (result) {
            resolve(usersArray)
          })
        }
      })
    })
}

function addUserToArray (user, userCounter, usersArray) {
  let tmp = user
  delete tmp.dn
  delete tmp.controls
  tmp.serNumber = userCounter
  if (user.secondarymail) {
    tmp.secondarymail = text2png(user.secondarymail, {
      font: '14px Futura',
      textColor: 'black',
      bgColor: 'white',
      lineSpacing: 1,
      padding: 1,
      output: 'dataURL'
    })
  }
  usersArray.push(tmp)
}

function ldapSearchQueryFormat (query) {
  return new Promise(
    function (resolve, reject) {
      let formatedLimit
      let attrPublic = ['id', 'displayName', 'displayName;lang-el', 'description', 'secondarymail', 'eduPersonAffiliation', 'title', 'telephoneNumber', 'labeledURI', 'eduPersonEntitlement']
      let searchAttr = [filter.attribute('eduPersonAffiliation').contains('staff')] //by default return only staff

      attrPublic = functionsUser.buildFieldsQueryLdap(attrPublic, query)
      formatedLimit = buildLimitQueryLdap(query)
      searchAttr = buildFilterQueryLdap(attrPublic, query, searchAttr)
      let output = filter.AND(searchAttr)

      if (output.filters.length > 0) {
        resolve({
          filter: output.toString(),
          scope: 'sub',
          paged: {pageSize: 250, pagePause: false},
          sizeLimit: formatedLimit,
          attributes: attrPublic
        })
      } else {
        reject(new ApplicationErrorClass(null, null, 61, null, 'Το πεδιο αυτό δεν υπάρχει', null, 500))
      }
    })
}

function buildFilterQueryLdap (attrPublic, query, searchAttr) {
  try {
    if (Object.prototype.hasOwnProperty.call(query, 'q')) {
      let queryQ = JSON.parse(query.q)
      if (!_.isEmpty(queryQ)) {
        searchAttr = []
        Object.keys(queryQ).forEach(function (attr) {
          if (isAttributeInPublicAttributes(attr, attrPublic)) {
            if (isAttributeInteger(attr) || attr === 'labeledURI' || attr === 'eduPersonEntitlement' || attr === 'eduPersonAffiliation') {
              searchAttr.push(filter.attribute(attr).equalTo(queryQ[attr]))
            } else {
              searchAttr.push(filter.attribute(attr).contains(queryQ[attr]))
            }
          }
        })
      }
    }
    return searchAttr
  } catch (err) {
    throw new ApplicationErrorClass(null, null, 61, null, 'Το query σας ειναι λάθος δομημένο', null, 500)
  }
}

function isAttributeInteger (attr) {
  return INTEGER_FIELDS.indexOf(attr) > -1
}

function isAttributeInPublicAttributes (attribute, attributesPublic) {
  return attributesPublic.indexOf(attribute) > -1
}

function buildLimitQueryLdap (query) {
  if (Object.prototype.hasOwnProperty.call(query, 'limit')) {
    return parseInt(query.limit)
  }
}

function buildPageSizeQueryLdap (query) {
  if (Object.prototype.hasOwnProperty.call(query, 'pageSize')) {
    return parseInt(query.pageSize)
  }
}

function checkForSorting (users, query) {
  let usersSorted = users
  if (Object.prototype.hasOwnProperty.call(query, 'sort')) {
    usersSorted = users.sort(dynamicSort(query.sort))
  }
  return usersSorted
}

function dynamicSort (property) {
  let sortOrder = 1
  if (property[0] === '-') {
    sortOrder = -1
    property = property.substr(1)
  }
  return function (a, b) {
    let result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0
    return result * sortOrder
  }
}

module.exports = {
  passwordsAreDifferent,
  oldPassIsCorrect,
  newPasswordExistsInHistory,
  sendEmailToken,
  buildEmailToken,
  validateIputForReset,
  buildTokenAndMakeEntryForReset,
  deleteResetToken,
  passwordsAreSame,
  ldapSearchQueryFormat,
  searchUsersOnLDAP,
  checkForSorting
}
