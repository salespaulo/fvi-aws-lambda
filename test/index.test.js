'use strict'

const chai = require('chai')
const uuid = require('uuid')

const app = require('../app')

describe('Testing', () => {
    const funcName = `funcName-${uuid.v4()}`
    const payload = { requestId: uuid.v4() }
    const id = uuid.v4()

    let instance = null

    before(() => {
        const mockData = {}
        mockData[funcName] = {
            testId: id,
        }
        instance = app(mockData)
    })

    it('Testing init mock mode', done => {
        app(true)('funcNameMocked')
            .then(res => {
                chai.assert.exists(res, 'res not exists!')
                chai.assert.exists(res.mock, 'res.mock not exists!')
                chai.assert.exists(res.mock.status, 'res.mock.status not exists!')
                chai.assert.exists(res.mock.params, 'res.mock.params not exists!')
                done()
            })
            .catch(done)
    })

    it('Testing aws lambda mock function', done => {
        instance(funcName, payload)
            .then(response => {
                chai.assert.exists(response, 'responseis not exists!')
                chai.assert.exists(response.mock, 'response.mock not exists!')
                chai.assert.exists(response.mock.status, 'response.mock.status not exists!')
                chai.assert.equal(200, response.mock.status, 'response.testId is not 200!')

                chai.assert.exists(response.mock.params, 'response.mock.params not exists!')
                chai.assert.exists(
                    response.mock.params.Payload,
                    'response.mock.params.Payload not exists!'
                )
                chai.assert.exists(
                    response.mock.params.Payload.requestId,
                    'response.mock.params.Payload.requestId not exists!'
                )
                chai.assert.equal(
                    payload.requestId,
                    response.mock.params.Payload.requestId,
                    `response.mock.params.Payload.requestId is not ${payload.requestId}!`
                )

                chai.assert.exists(response.testId, 'response.testId not exists!')
                chai.assert.equal(id, response.testId, `response.testId is not ${id}!`)

                done()
            })
            .catch(done)
    })
})
