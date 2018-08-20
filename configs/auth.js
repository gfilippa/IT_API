const jwt = require('jsonwebtoken')
const fs = require('fs')
const Promise = require('promise')
const ldap = require('ldapjs')
const audience = {
  production: '59a99d5989ef64657780879c',
  development: '59a99d5989ef64657780879c'
}

const cert = fs.readFileSync('./public.pem') // get public key
const config = require('./config')

const ldapClient = ldap.createClient({
  url: config.LDAP[process.env.NODE_ENV].host
})

function getUser (userID) {
  return new Promise(
    function (resolve, reject) {
      let opts = {
        filter: '(id=' + userID + ')',
        scope: 'sub',
        attributes: []
      }

      ldapClient.search(config.LDAP[process.env.NODE_ENV].baseUserDN, opts, function (err, results) {
        let user = {}
        if (err) {
          reject(new Error({
            type: 'SearchUserError',
            code: 4004,
            httpCode: 500,
            text: 'Unexpected user search error, please try again later.'
          }))
        } else {
          results.on('searchEntry', function (entry) {
            let tmp = entry.object
            delete tmp.controls
            user = tmp
          })
          results.on('error', function () {
            reject(new Error({
              type: 'SearchUserError',
              code: 4005,
              httpCode: 500,
              text: 'Unexpected user search error, please try again later.'
            }))
          })
          results.on('end', function (result) {
            if (!err) { resolve(user) }
          })
        }
      })
    })
}

function checkToken (token, scopeRequired, userScopeRequired) {
  return new Promise(
    function (resolve, reject) {
      let errorCustom = new Error()
      errorCustom.httpCode = 400
      jwt.verify(token, cert, {audience: audience[process.env.NODE_ENV]}, function (err, tokenInfo) {
        if (err) {
          errorCustom.type = 'TokenExpiredError'
          if (err.name === 'TokenExpiredError') {
            errorCustom.code = 4001
            errorCustom.text = 'Access token has expired.'
            reject(errorCustom)
          } else {
            errorCustom.code = 4002
            errorCustom.text = 'An active access token required to complete this action.'
            reject(errorCustom)
          }
        } else {
          // doulevei den exw idea ti kanei to every
          if (scopeRequired.every(val => tokenInfo.scope.includes(val))) {
            getUser(tokenInfo.userId)
              .then(function (user) {
                if (user.eduPersonScopedAffiliation >= userScopeRequired) {
                  resolve(user)
                } else {
                  errorCustom.type = 'UserPermissionError'
                  errorCustom.code = 4006
                  errorCustom.text = 'Permission denied. User cannot access this resource.'
                  reject(errorCustom)
                }
              }, function (err) {
                reject(err)
              })
          } else {
            errorCustom.type = 'TokenError'
            errorCustom.code = 4003
            errorCustom.text = 'Access token doesn\'t have the required scope to complete this action. Scope required : ' + scopeRequired
            reject(errorCustom)
            reject(errorCustom)
          }
        }
      })
    })
}

/**
 *
 * @param scopeRequired : scope_name = access token scope required to access this function
 * @param userScopeRequired : 1-9 = eduPersonScopedAffiliation value required
 * @param ignoreToken : True/False = continue even if the token doesn't exist
 * @returns req.user
 */
function checkAuth (scopeRequired, userScopeRequired, ignoreToken) {
  return function (req, res, next) {
    let token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token']
    delete req.body.access_token
    delete req.query.access_token
    checkToken(token, scopeRequired, userScopeRequired)
      .then(function (user) {
        req.user = user
        next()
      }, function (err) {
        if (ignoreToken) { next() } else {
          next(err)
        }
      })
  }
}

module.exports = {
  checkAuth
}
