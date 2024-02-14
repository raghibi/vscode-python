// /* eslint-disable @typescript-eslint/no-explicit-any */
// // Copyright (c) Microsoft Corporation. All rights reserved.
// // Licensed under the MIT License.
// import { TestController, TestRun, Uri } from 'vscode';
// import * as typeMoq from 'typemoq';
// import * as path from 'path';
// import * as assert from 'assert';
// import * as net from 'net';
// import { Observable } from 'rxjs';
// // import { PytestTestDiscoveryAdapter } from '../../../client/testing/testController/pytest/pytestDiscoveryAdapter';
// import * as sinon from 'sinon';
// import { Message } from 'vscode-jsonrpc';
// import { ITestController, ITestResultResolver } from '../../../client/testing/testController/common/types';
// import { IPythonExecutionFactory, IPythonExecutionService, Output } from '../../../client/common/process/types';
// // import { ITestDebugLauncher } from '../../../client/testing/common/types';
// import { IConfigurationService, ITestOutputChannel } from '../../../client/common/types';
// import { IServiceContainer } from '../../../client/ioc/types';
// import { initialize } from '../../initialize';
// import { PytestTestExecutionAdapter } from '../../../client/testing/testController/pytest/pytestExecutionAdapter';
// import { PythonResultResolver } from '../../../client/testing/testController/common/resultResolver';
// import { PYTEST_PROVIDER } from '../../../client/testing/common/constants';
// import { MockChildProcess } from '../../mocks/mockChildProcess';
// import { createDeferred } from '../../../client/common/utils/async';
// import * as namedPipes from '../../../client/common/pipes/namedPipes';

// import {
//     PAYLOAD_SINGLE_CHUNK,
//     PAYLOAD_MULTI_CHUNK,
//     PAYLOAD_SPLIT_ACROSS_CHUNKS_ARRAY,
//     DataWithPayloadChunks,
//     PAYLOAD_SPLIT_MULTI_CHUNK_ARRAY,
//     PAYLOAD_ONLY_HEADER_MULTI_CHUNK,
// } from '../testController/payloadTestCases';
// import { traceLog } from '../../../client/logging';

// const FAKE_UUID = 'fake-u-u-i-d';
// export interface TestCase {
//     name: string;
//     value: DataWithPayloadChunks;
// }

// /**
//  * The following tests are for testing the end to end flow of the test controller.
//  * During this test everything is set up, but the data sent BACK from the python side is mocked.
//  * It is mocked in order to specify payload data in unique chunks.
//  * The data is the `testCases` array below.
//  */

// /** steps
//  *
//  * 1. create pipe_name and SAVE for connection
//  * 2. create a mock python server at pipe_name
//  * 3. when something connects to the mock python server, send back the payload data
//  * 4. when data is then received, it will be parsed and sent to the resultResolver
//  * 5. verify that the resultResolver received the correct data
//  */
// const testCases: Array<TestCase> = [
//     {
//         name: 'header in single chunk edge case',
//         value: PAYLOAD_ONLY_HEADER_MULTI_CHUNK(FAKE_UUID),
//     },
//     {
//         name: 'single payload single chunk',
//         value: PAYLOAD_SINGLE_CHUNK(FAKE_UUID),
//     },
//     {
//         name: 'multiple payloads per buffer chunk',
//         value: PAYLOAD_MULTI_CHUNK(FAKE_UUID),
//     },
//     {
//         name: 'single payload across multiple buffer chunks',
//         value: PAYLOAD_SPLIT_ACROSS_CHUNKS_ARRAY(FAKE_UUID),
//     },
//     {
//         name: 'two chunks, payload split and two payloads in a chunk',
//         value: PAYLOAD_SPLIT_MULTI_CHUNK_ARRAY(FAKE_UUID),
//     },
// ];

// suite('EOT tests', () => {
//     let resultResolver: ITestResultResolver;
//     // let debugLauncher: ITestDebugLauncher;
//     let configService: IConfigurationService;
//     let serviceContainer: IServiceContainer;
//     let workspaceUri: Uri;
//     let testOutputChannel: typeMoq.IMock<ITestOutputChannel>;
//     let testController: TestController;
//     const sandbox = sinon.createSandbox();
//     let stubExecutionFactory: typeMoq.IMock<IPythonExecutionFactory>;
//     let generateRandomPipeNameSpy: sinon.SinonSpy<any, any>;
//     let client: net.Socket;
//     // const unittestProvider: TestProvider = UNITTEST_PROVIDER;
//     // const pytestProvider: TestProvider = PYTEST_PROVIDER;
//     let mockProc: MockChildProcess;
//     const rootPathSmallWorkspace = path.join('src');
//     suiteSetup(async () => {
//         serviceContainer = (await initialize()).serviceContainer;
//     });

//     setup(async () => {
//         // create objects that were injected
//         configService = serviceContainer.get<IConfigurationService>(IConfigurationService);
//         // debugLauncher = serviceContainer.get<ITestDebugLauncher>(ITestDebugLauncher);
//         testController = serviceContainer.get<TestController>(ITestController);

//         client = new net.Socket();
//         client.on('error', (error) => {
//             traceLog('Socket connection error:', error);
//         });

//         mockProc = new MockChildProcess('', ['']);

//         generateRandomPipeNameSpy = sinon.spy(namedPipes, 'generateRandomPipeName');

//         testOutputChannel = typeMoq.Mock.ofType<ITestOutputChannel>();
//         testOutputChannel
//             .setup((x) => x.append(typeMoq.It.isAny()))
//             .callback((appendVal: any) => {
//                 traceLog('out - ', appendVal.toString());
//             })
//             .returns(() => {
//                 // Whatever you need to return
//             });
//         testOutputChannel
//             .setup((x) => x.appendLine(typeMoq.It.isAny()))
//             .callback((appendVal: any) => {
//                 traceLog('outL - ', appendVal.toString());
//             })
//             .returns(() => {
//                 // Whatever you need to return
//             });
//     });
//     teardown(async () => {
//         // ythonTestServer.dispose();
//         sandbox.restore();
//         generateRandomPipeNameSpy.restore();
//     });
//     testCases.forEach((testCase) => {
//         test(`Testing Payloads: ${testCase.name}`, async () => {
//             const output2 = new Observable<Output<string>>(() => {
//                 /* no op */
//             });
//             // stub out execution service and factory so mock data is returned from client.
//             const stubExecutionService = ({
//                 execObservable: async () =>
//                     //
//                     {
//                         const pipeGenName = generateRandomPipeNameSpy.returnValues[0];
//                         const [, writer] = namedPipes.namedPipeClient(pipeGenName); // Replace '_' with a meaningful variable name
//                         // now go through and write all data to the pipe
//                         traceLog('socket connected, sending stubbed data');
//                         // payload is a string array, each string represents one line written to the buffer
//                         const { payloadArray } = testCase.value;
//                         for (let i = 0; i < payloadArray.length; i = i + 1) {
//                             writer.write({
//                                 jsonrpc: '2.0',
//                                 params: payloadArray[i],
//                             } as Message);
//                             // await (async (clientSub, payloadSub) => {
//                             //     if (!clientSub.write(payloadSub)) {
//                             //         // If write returns false, wait for the 'drain' event before proceeding
//                             //         await new Promise((resolve) => clientSub.once('drain', resolve));
//                             //     }
//                             // })(client, payloadArray[i]);
//                         }
//                         // mockProc.emit('close', 0, null);
//                         // client.end();

//                         // writer.end();
//                         // startListenServer('val val', pipeGenName);
//                         // client.connect(pipeGenName);
//                         // return {
//                         //     proc: mockProc,
//                         //     out: output2,
//                         //     dispose: () => {
//                         //         /* no-body */
//                         //     },
//                         // };
//                     },
//             } as unknown) as IPythonExecutionService;

//             stubExecutionFactory = typeMoq.Mock.ofType<IPythonExecutionFactory>();
//             stubExecutionFactory
//                 .setup((x) => x.createActivatedEnvironment(typeMoq.It.isAny()))
//                 .returns(() => Promise.resolve(stubExecutionService));

//             const dataDeferred = createDeferred<void>();

//             let actualCollectedResult = '';

//             let errorBool = false;
//             let errorMessage = '';
//             resultResolver = new PythonResultResolver(testController, PYTEST_PROVIDER, workspaceUri);
//             resultResolver._resolveExecution = async (payload, _token?) => {
//                 // the payloads that get to the _resolveExecution are all data and should be successful.
//                 actualCollectedResult = actualCollectedResult + JSON.stringify(payload.result);
//                 if (payload.status !== 'success') {
//                     errorBool = true;
//                     errorMessage = "Expected status to be 'success'";
//                 }
//                 if (!payload.result) {
//                     errorBool = true;
//                     errorMessage = 'Expected results to be present';
//                 }

//                 return Promise.resolve();
//             };
//             // client.on('connect', async () => {
//             //     traceLog('socket connected, sending stubbed data');
//             //     // payload is a string array, each string represents one line written to the buffer
//             //     const rpc = {
//             //         jsonrpc: '2.0',
//             //         params: SINGLE_PYTEST_PAYLOAD,
//             //     };
//             //     const payload = createPayload2(rpc);
//             //     client.write(Buffer.from(payload, 'utf-8'));
//             //     // const { payloadArray } = testCase.value;
//             //     // for (let i = 0; i < payloadArray.length; i = i + 1) {
//             //     //     await (async (clientSub, payloadSub) => {
//             //     //         if (!clientSub.write(payloadSub)) {
//             //     //             // If write returns false, wait for the 'drain' event before proceeding
//             //     //             await new Promise((resolve) => clientSub.once('drain', resolve));
//             //     //         }
//             //     //     })(client, payloadArray[i]);
//             //     // }
//             //     // mockProc.emit('close', 0, null);
//             //     // // client.end();
//             // });

//             // set workspace to test workspace folder
//             workspaceUri = Uri.parse(rootPathSmallWorkspace);

//             // run pytest execution
//             const executionAdapter = new PytestTestExecutionAdapter(
//                 configService,
//                 testOutputChannel.object,
//                 resultResolver,
//             );
//             const testRun = typeMoq.Mock.ofType<TestRun>();
//             testRun
//                 .setup((t) => t.token)
//                 .returns(
//                     () =>
//                         ({
//                             onCancellationRequested: () => undefined,
//                         } as any),
//                 );
//             await executionAdapter
//                 .runTests(
//                     workspaceUri,
//                     [`${rootPathSmallWorkspace}/test_simple.py::test_a`],
//                     false,
//                     testRun.object,
//                     stubExecutionFactory.object,
//                 )
//                 .then(async () => {
//                     await dataDeferred;
//                     assert.strictEqual(
//                         testCase.value.data,
//                         actualCollectedResult,
//                         "Expected collected result to match 'data'",
//                     );
//                     assert.strictEqual(errorBool, false, errorMessage);
//                 });
//         });
//     });
// });
