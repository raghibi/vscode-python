// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { assert } from 'chai';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { Uri, WorkspaceConfiguration } from 'vscode';
import {
    isNativeEnvInfo,
    NativeEnvInfo,
    NativePythonFinder,
    NativePythonFinderImpl,
} from '../../client/pythonEnvironments/base/locators/common/nativePythonFinder';
import * as windowsApis from '../../client/common/vscodeApis/windowApis';
import { MockOutputChannel } from '../mockClasses';
import * as workspaceApis from '../../client/common/vscodeApis/workspaceApis';
import { flattenIterable } from '../../client/common/utils/async';
import { NativePythonEnvironmentKind } from '../../client/pythonEnvironments/base/locators/common/nativePythonUtils';

suite('Native Python Finder', () => {
    let finder: NativePythonFinder;
    let createLogOutputChannelStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;
    let configMock: typemoq.IMock<WorkspaceConfiguration>;
    let getWorkspaceFolderPathsStub: sinon.SinonStub;

    setup(() => {
        createLogOutputChannelStub = sinon.stub(windowsApis, 'createLogOutputChannel');
        createLogOutputChannelStub.returns(new MockOutputChannel('locator'));

        getWorkspaceFolderPathsStub = sinon.stub(workspaceApis, 'getWorkspaceFolderPaths');
        getWorkspaceFolderPathsStub.returns([]);

        getConfigurationStub = sinon.stub(workspaceApis, 'getConfiguration');
        configMock = typemoq.Mock.ofType<WorkspaceConfiguration>();
        configMock.setup((c) => c.get<string>('venvPath')).returns(() => undefined);
        configMock.setup((c) => c.get<string[]>('venvFolders')).returns(() => []);
        configMock.setup((c) => c.get<string>('condaPath')).returns(() => '');
        configMock.setup((c) => c.get<string>('poetryPath')).returns(() => '');
        getConfigurationStub.returns(configMock.object);

        finder = new NativePythonFinderImpl();
    });

    teardown(() => {
        sinon.restore();
    });

    suiteTeardown(() => {
        finder.dispose();
    });

    test('Refresh should return python environments', async () => {
        const envs = [];
        for await (const env of finder.refresh()) {
            envs.push(env);
        }

        // typically all test envs should have at least one environment
        assert.isNotEmpty(envs);
    });

    test('Resolve should return python environments with version', async () => {
        const envs = [];
        for await (const env of finder.refresh()) {
            envs.push(env);
        }

        // typically all test envs should have at least one environment
        assert.isNotEmpty(envs);

        // pick and env without version
        const env: NativeEnvInfo | undefined = envs
            .filter((e) => isNativeEnvInfo(e))
            .find((e) => e.version && e.version.length > 0 && (e.executable || (e as NativeEnvInfo).prefix));

        if (env) {
            env.version = undefined;
        } else {
            assert.fail('Expected at least one env with valid version');
        }

        const envPath = env.executable ?? env.prefix;
        if (envPath) {
            const resolved = await finder.resolve(envPath);
            assert.isString(resolved.version, 'Version must be a string');
            assert.isTrue((resolved?.version?.length ?? 0) > 0, 'Version must not be empty');
        } else {
            assert.fail('Expected either executable or prefix to be defined');
        }
    });
    test('Find Python environment when the parent (bin/scripts) directory is given', async () => {
        const envs = (await flattenIterable(finder.refresh())).filter(isNativeEnvInfo);

        const condaEnv = envs.find((e) => e.kind === NativePythonEnvironmentKind.Conda && e.executable && e.prefix);
        const prefix = condaEnv?.prefix;
        if (!condaEnv || !prefix) {
            return;
        }

        // Running a find on this env should return the same details.
        const foundEnvs = (await flattenIterable(finder.refresh([Uri.file(prefix)]))).filter(isNativeEnvInfo);
        const foundEnv = foundEnvs.find((e) => e.executable === condaEnv.executable);

        assert.ok(foundEnv, `Conda env ${JSON.stringify(condaEnv)} not found, only found ${foundEnvs}`);
        assert.deepEqual(condaEnv, foundEnv);
    });
    test('Find Python environment with exe', async () => {
        const envs = (await flattenIterable(finder.refresh())).filter(isNativeEnvInfo);

        const condaEnv = envs.find((e) => e.kind === NativePythonEnvironmentKind.Conda && e.executable && e.prefix);
        const executable = condaEnv?.executable;
        if (!condaEnv || !executable) {
            return;
        }

        // Running a find on this env should return the same details.
        const foundEnvs = (await flattenIterable(finder.refresh([Uri.file(executable)]))).filter(isNativeEnvInfo);
        const foundEnv = foundEnvs.find((e) => e.executable === condaEnv.executable);

        assert.ok(foundEnv, `Conda env ${JSON.stringify(condaEnv)} not found, only found ${foundEnvs}`);
        assert.deepEqual(condaEnv, foundEnv);
    });
    test('Find Python environment in current workspace folder return a list of envs', async () => {
        const envs = (await flattenIterable(finder.refresh())).filter(isNativeEnvInfo);

        const condaEnv = envs.find((e) => e.kind === NativePythonEnvironmentKind.Conda && e.executable && e.prefix);
        const executable = condaEnv?.executable;
        if (!condaEnv || !executable) {
            return;
        }

        // Running a find on this env should return the same details.
        const foundEnvs = (await flattenIterable(finder.refresh([Uri.file(executable)]))).filter(isNativeEnvInfo);
        const foundEnv = foundEnvs.find((e) => e.executable === condaEnv.executable);

        assert.ok(foundEnv, `Conda env ${JSON.stringify(condaEnv)} not found, only found ${foundEnvs}`);
        assert.deepEqual(condaEnv, foundEnv);
    });
    test('Find Python environment in current workspace folder return a list of envs', async () => {
        const envs = (await flattenIterable(finder.refresh())).filter(isNativeEnvInfo);

        const condaEnv = envs.find((e) => e.kind === NativePythonEnvironmentKind.Conda && e.executable && e.prefix);
        const executable = condaEnv?.executable;
        if (!condaEnv || !executable) {
            return;
        }

        // Running a find on this env should return the same details.
        const foundEnvs = (await flattenIterable(finder.refresh([Uri.file(executable)]))).filter(isNativeEnvInfo);
        const foundEnv = foundEnvs.find((e) => e.executable === condaEnv.executable);

        assert.ok(foundEnv, `Conda env ${JSON.stringify(condaEnv)} not found, only found ${foundEnvs}`);
        assert.deepEqual(condaEnv, foundEnv);
    });
    test('Find just conda envs', async () => {
        const envs = (await flattenIterable(finder.refresh())).filter(isNativeEnvInfo);

        if (!envs.some((e) => e.kind === NativePythonEnvironmentKind.Conda)) {
            return;
        }
        finder.dispose();

        finder = new NativePythonFinderImpl();
        // Running a find on this env should return the same details.
        const foundEnvs = (await flattenIterable(finder.refresh(NativePythonEnvironmentKind.Conda))).filter(
            isNativeEnvInfo,
        );

        assert.ok(
            envs.some((e) => e.kind === NativePythonEnvironmentKind.Conda),
            `Conda envs not found, only found ${foundEnvs}`,
        );
    });
});
