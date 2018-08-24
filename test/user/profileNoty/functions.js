let rewire = require('rewire'),
  functionsPrivate = rewire('./../../../routes/user/profileNoty/function')
let functionsPublic = require('./../../../routes/user/profileNoty/function')

describe('categories', () => {
  let fp = 'Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.01d354538d3af49f9a5d3d6a5394e73e5'

  before(function (done) {
    this.timeout(10000)
    fixtures
      .connect('mongodb://admin:Password@192.168.6.94/myapptest')
      .then(() => fixtures.unload())
      .then(() => fixtures.load())
      .then(function () {
        done()
      }).catch(e => function () {
      done(new Error('Fixtures error'))
    })
  })

  after(function (done) {
    this.timeout(10000)
    fixtures
      .connect('mongodb://admin:Password@192.168.6.94/myapptest')
      .then(() => fixtures.disconnect())
      .then(function () {
        done()
      }).catch(e => function () {
      done(new Error('Fixtures error'))
    })
  })

  context('routes', () => {

    context('getNotySub', () => {

      it('it should return a 200 code with notySub null when not sending fp', (done) => {
        chai.request(server)
          .get('/noty?' + access_token)
          .end((err, res) => {
            res.body.should.have.property('notySub')
            let notySub = res.body.notySub
            expect(notySub).to.not.exist
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 200 code with notySub not null when sending fp', (done) => {
        chai.request(server)
          .get('/noty?fp=' + fp + '&' + access_token)
          .end((err, res) => {
            res.body.should.have.property('notySub')
            let notySub = res.body.notySub
            notySub.should.be.an('object')
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 200 code with notySub of null when sending fp what doesn`t exist', (done) => {
        chai.request(server)
          .get('/noty?fp=NotExist&' + access_token)
          .end((err, res) => {
            res.body.should.have.property('notySub')
            let notySub = res.body.notySub
            expect(notySub).to.not.exist
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 400 when not authenticated', (done) => {
        chai.request(server)
          .get('/noty')
          .end((err, res) => {
            res.should.have.status(400)
            done()
          })
      })

    })

    context('disableNotySub', () => {

      it('it should return a 200 when disabling a noty', (done) => {
        chai.request(server)
          .delete('/noty?' + access_token)
          .send({browserFp: fp})
          .end((err, res) => {
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 200 when disabling all noties', (done) => {
        chai.request(server)
          .delete('/noty?' + access_token)
          .send({all: true})
          .end((err, res) => {
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 500 when passing wrong body arguments', (done) => {
        chai.request(server)
          .delete('/noty?' + access_token)
          .send({wrongArgument: true, anotherWrongArgument: 'invalid'})
          .end((err, res) => {
            res.should.have.status(500)
            done()
          })
      })

      it('it should return an error when browserFp doesn`t exist', (done) => {
        chai.request(server)
          .delete('/noty?' + access_token)
          .send({browserFp: 'NotExist'})
          .end((err, res) => {
            res.should.have.status(500)
            done()
          })
      })

      it('it should return a 400 when not authenticated', (done) => {
        chai.request(server)
          .delete('/noty')
          .send({browserFp: 'NotExist'})
          .end((err, res) => {
            res.should.have.status(400)
            done()
          })
      })

    })

    context('enableNotySub', () => {

      it('it should return a 200 when enabling a new noty', (done) => {
        chai.request(server)
          .patch('/noty?' + access_token)
          .send({
            auth: '5o02bRa3qYpWxoruvRz3mA==',
            p256dh: 'BCHVhxtYtqLRPeUYEdXAruJjEZDWKattWNvWUm1vYHHpU3i9N57tTSBBWiqp+MK/f3DR5kC+DU92zgMOdLAu99A=',
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v1/gAAAAABZvA9woXBGjz-0AbFG1oziTkyACslBLGYIHV38oKsyyQxHx8o7BTiHX8zUSBulyyKEZYdlAg3wJw9pEjch6ez3t6ES-VlCQ54l44vT4O0bZb4KaHkkR26hkX6APeIA07sYRo6a',
            browserFp: '2Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.01d354538d3af49f9a5d3d6a5394e73e5',
          })
          .end((err, res) => {
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 200 when enabling an existing noty', (done) => {
        chai.request(server)
          .patch('/noty?' + access_token)
          .send({
            auth: '5o02bRa3qYpWxoruvRz3mA==',
            p256dh: 'BCHVhxtYtqLRPeUYEdXAruJjEZDWKattWNvWUm1vYHHpU3i9N57tTSBBWiqp+MK/f3DR5kC+DU92zgMOdLAu99A=',
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v1/gAAAAABZvA9woXBGjz-0AbFG1oziTkyACslBLGYIHV38oKsyyQxHx8o7BTiHX8zUSBulyyKEZYdlAg3wJw9pEjch6ez3t6ES-VlCQ54l44vT4O0bZb4KaHkkR26hkX6APeIA07sYRo6a',
            browserFp: 'Mozilla/5.0 (X11; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.01d354538d3af49f9a5d3d6a5394e73e5',
          })
          .end((err, res) => {
            res.should.have.status(200)
            done()
          })
      })

      it('it should return a 500 when passing wrong body arguments', (done) => {
        chai.request(server)
          .patch('/noty?' + access_token)
          .send({wrongArgument: true, anotherWrongArgument: 'invalid'})
          .end((err, res) => {
            res.should.have.status(500)
            done()
          })
      })


      it('it should return a 400 when not authenticated', (done) => {
        chai.request(server)
          .patch('/noty')
          .send({browserFp: 'NotExist'})
          .end((err, res) => {
            res.should.have.status(400)
            done()
          })
      })

    })

  })

})