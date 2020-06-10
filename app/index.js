'use strict'

const utils = require('fvi-node-utils')

const REGION = 'us-east-1'
const API_VERSION = '2015-03-31'

const INVOCATION_TYPE = 'RequestResponse'
const LOG_TYPE = 'Tail'

const LOG_PREFIX = '[robot][aws][lambda]'

const configure = (
    funcName,
    payload = '',
    invocationType = INVOCATION_TYPE,
    logType = LOG_TYPE
) => {
    return {
        FunctionName: funcName,
        Payload: Buffer.from(JSON.stringify(payload)),
        InvocationType: invocationType,
        LogType: logType,
    }
}

const getStatusCodeSuccessTo = invocationType => {
    switch (invocationType) {
        case 'Event':
            return 202
        case 'DryRun':
            return 204
        default:
            return 200
    }
}

const mockInvoke = (params, request, mockData) => {
    utils.debug.here(
        `${LOG_PREFIX}[mock]: Invoking params: ${utils.objects.inspect(
            params
        )}; payload: ${utils.objects.inspect(request)}`
    )

    const response = mockData[params.FunctionName]
    return Promise.resolve({ mock: { status: 200, params }, ...response })
}

const lambdaFunction = (mockData = null) => (
    funcName,
    request,
    invocationType = INVOCATION_TYPE,
    logType = LOG_TYPE,
    apiVersion = API_VERSION,
    region = REGION
) => {
    try {
        const params = configure(funcName, request, invocationType, logType)

        if (mockData != null) {
            params.Payload = request
            return mockInvoke(params, request, mockData)
        }

        const AWS = require('aws-sdk')
        const lambda = new AWS.Lambda({ apiVersion, region })

        utils.debug.here(
            `${LOG_PREFIX}: Invoking name: ${funcName}; payload: ${utils.objects.inspect(
                request
            )}; params: ${utils.objects.inspect(params)}`
        )

        return new Promise((res, rej) =>
            lambda.invoke(params, (err, response) => {
                if (err) {
                    utils.debug.here(
                        `${LOG_PREFIX}[ERROR]: Invoke name: ${funcName}; response: ${utils.objects.inspect(
                            err
                        )}`
                    )
                    return rej(err)
                }

                utils.debug.here(
                    `${LOG_PREFIX}: Invoke name: ${funcName}; response: ${utils.objects.inspect(
                        response
                    )}`
                )

                const statusCode = response.StatusCode
                const payload = response.Payload
                const isSuccessfuly = statusCode === getStatusCodeSuccessTo(invocationType)

                if (isSuccessfuly) {
                    try {
                        const data = JSON.parse(payload)
                        const logResult = Buffer.from(response.LogResult, 'base64')
                        const functionError = response.FunctionError
                        const throwsError = functionError != null

                        if (throwsError) {
                            return res({
                                status: 500,
                                error: { payload, logResult: logResult.toString('ascii') },
                            })
                        }

                        data.logResult = logResult.toString('ascii')
                        return res(data)
                    } catch (e) {
                        return rej(e)
                    }
                }

                const executedVersion = response.ExecutedVersion
                return rej(
                    new Error(
                        `AWS Lambda Error executedVersion=${executedVersion}; statusCode=${statusCode}; payload=${utils.objects.inspect(
                            payload
                        )}`
                    )
                )
            })
        )
    } catch (e) {
        return Promise.reject(e)
    }
}

module.exports = lambdaFunction
