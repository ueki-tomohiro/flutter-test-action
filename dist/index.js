require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 2596:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var fs = __nccwpck_require__(9896),
    path = __nccwpck_require__(6928);

/* istanbul ignore next */
var exists = fs.exists || path.exists;

var walkFile = function(str, cb) {
    var data = [], item;

    [ 'end_of_record' ].concat(str.split('\n')).forEach(function(line) {
        line = line.trim();
        var allparts = line.split(':'),
            parts = [allparts.shift(), allparts.join(':')],
            lines, fn;

        switch (parts[0].toUpperCase()) {
            case 'TN':
                item.title = parts[1].trim();
                break;
            case 'SF':
                item.file = parts.slice(1).join(':').trim();
                break;
            case 'FNF':
                item.functions.found = Number(parts[1].trim());
                break;
            case 'FNH':
                item.functions.hit = Number(parts[1].trim());
                break;
            case 'LF':
                item.lines.found = Number(parts[1].trim());
                break;
            case 'LH':
                item.lines.hit = Number(parts[1].trim());
                break;
            case 'DA':
                lines = parts[1].split(',');
                item.lines.details.push({
                    line: Number(lines[0]),
                    hit: Number(lines[1])
                });
                break;
            case 'FN':
                fn = parts[1].split(',');
                item.functions.details.push({
                    name: fn[1],
                    line: Number(fn[0])
                });
                break;
            case 'FNDA':
                fn = parts[1].split(',');
                item.functions.details.some(function(i, k) {
                    if (i.name === fn[1] && i.hit === undefined) {
                        item.functions.details[k].hit = Number(fn[0]);
                        return true;
                    }
                });
                break;
            case 'BRDA':
                fn = parts[1].split(',');
                item.branches.details.push({
                    line: Number(fn[0]),
                    block: Number(fn[1]),
                    branch: Number(fn[2]),
                    taken: ((fn[3] === '-') ? 0 : Number(fn[3]))
                });
                break;
            case 'BRF':
                item.branches.found = Number(parts[1]);
                break;
            case 'BRH':
                item.branches.hit = Number(parts[1]);
                break;
        }

        if (line.indexOf('end_of_record') > -1) {
            data.push(item);
            item = {
              lines: {
                  found: 0,
                  hit: 0,
                  details: []
              },
              functions: {
                  hit: 0,
                  found: 0,
                  details: []
              },
              branches: {
                hit: 0,
                found: 0,
                details: []
              }
            };
        }
    });

    data.shift();

    if (data.length) {
        cb(null, data);
    } else {
        cb('Failed to parse string');
    }
};

var parse = function(file, cb) {
    exists(file, function(x) {
        if (!x) {
            return walkFile(file, cb);
        }
        fs.readFile(file, 'utf8', function(err, str) {
            walkFile(str, cb);
        });
    });

};


module.exports = parse;
module.exports.source = walkFile;


/***/ }),

/***/ 7474:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseLcovFile = parseLcovFile;
exports.toCoverageData = toCoverageData;
exports.percentage = percentage;
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = __nccwpck_require__(2596);
/* eslint-disable @typescript-eslint/no-explicit-any */
async function parseLcovFile(path) {
    const records = await new Promise((resolve, reject) => {
        parse(path, (error, info) => {
            if (error) {
                reject(new Error(`Failed to parse coverage file ${path}: ${String(error)}`));
                return;
            }
            resolve(info);
        });
    });
    return toCoverageData(records);
}
function toCoverageData(records) {
    const files = records.filter(Boolean).map(toFileCoverage);
    return {
        files,
        lines: sum(files.map(f => f.lines)),
        functions: sum(files.map(f => f.functions)),
        branches: sum(files.map(f => f.branches))
    };
}
function percentage({ hit, found }) {
    if (found === 0)
        return undefined;
    return Math.floor((hit / found) * 1000) / 10;
}
function toFileCoverage(record) {
    const lineHits = new Map();
    for (const detail of record['lines']?.['details'] ?? []) {
        const line = Number(detail['line']);
        lineHits.set(line, (lineHits.get(line) ?? 0) + Number(detail['hit'] ?? 0));
    }
    return {
        path: record['file'],
        lineHits,
        lines: toCount(record['lines']),
        functions: toCount(record['functions']),
        branches: toCount(record['branches'])
    };
}
function toCount(json) {
    return { hit: Number(json?.['hit'] ?? 0), found: Number(json?.['found'] ?? 0) };
}
function sum(counts) {
    return counts.reduce((total, count) => ({
        hit: total.hit + count.hit,
        found: total.found + count.found
    }), { hit: 0, found: 0 });
}


/***/ }),

/***/ 2371:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseAddedLines = parseAddedLines;
exports.computeChangedLinesCoverage = computeChangedLinesCoverage;
const paths_1 = __nccwpck_require__(5782);
/**
 * Returns the line numbers added by a unified diff patch, as returned by the
 * GitHub pull request files API.
 */
function parseAddedLines(patch) {
    const added = [];
    let newLine = 0;
    for (const line of patch.split('\n')) {
        const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(line);
        if (hunk) {
            newLine = Number(hunk[1]);
            continue;
        }
        if (newLine === 0)
            continue;
        if (line.startsWith('+')) {
            added.push(newLine);
            newLine++;
        }
        else if (line.startsWith('-') || line.startsWith('\\')) {
            // Removed lines and "\ No newline at end of file" do not exist in the
            // new file.
        }
        else {
            newLine++;
        }
    }
    return added;
}
function computeChangedLinesCoverage(changedFiles, coverage, context) {
    const coverageByPath = new Map(coverage.files.flatMap(file => {
        const repoPath = (0, paths_1.toRepoPath)(file.path, context);
        return repoPath ? [[repoPath, file]] : [];
    }));
    const libPrefix = context.workingDirectory
        ? `${context.workingDirectory}/lib/`
        : 'lib/';
    const result = {
        files: [],
        covered: 0,
        total: 0,
        missingFiles: []
    };
    for (const changed of changedFiles) {
        const fileCoverage = coverageByPath.get(changed.path);
        if (!fileCoverage) {
            if (changed.addedLines.length > 0 &&
                changed.path.startsWith(libPrefix) &&
                isHandWrittenDart(changed.path)) {
                result.missingFiles.push(changed.path);
            }
            continue;
        }
        const instrumented = [...new Set(changed.addedLines)]
            .filter(line => fileCoverage.lineHits.has(line))
            .sort((a, b) => a - b);
        if (instrumented.length === 0)
            continue;
        let covered = 0;
        const uncovered = [];
        let current;
        for (const line of instrumented) {
            if ((fileCoverage.lineHits.get(line) ?? 0) > 0) {
                covered++;
                current = undefined;
                continue;
            }
            // Uncovered lines stay in one range until a covered line appears, so
            // blank lines and comments between them do not split the range.
            if (current) {
                current.end = line;
            }
            else {
                current = { start: line, end: line };
                uncovered.push(current);
            }
        }
        result.files.push({
            path: changed.path,
            covered,
            total: instrumented.length,
            uncovered
        });
        result.covered += covered;
        result.total += instrumented.length;
    }
    return result;
}
function isHandWrittenDart(filePath) {
    return (filePath.endsWith('.dart') &&
        !/\.(g|freezed|mocks|gr|config|gen)\.dart$/u.test(filePath));
}


/***/ }),

/***/ 4171:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readContext = readContext;
exports.commentMarker = commentMarker;
exports.fetchChangedFiles = fetchChangedFiles;
exports.createCheckRun = createCheckRun;
exports.upsertComment = upsertComment;
const diff_1 = __nccwpck_require__(2371);
// GitHub accepts up to 50 annotations per request.
const annotationsPerRequest = 50;
function readContext(github) {
    const { context } = github;
    const { owner, repo } = context.repo;
    const pr = context.payload.pull_request;
    const sha = pr?.head?.sha ?? context.sha;
    const serverUrl = context.serverUrl || 'https://github.com';
    return {
        owner,
        repo,
        sha,
        pullNumber: pr?.number,
        links: {
            serverUrl,
            owner,
            repo,
            sha,
            runUrl: context.runId
                ? `${serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`
                : undefined
        }
    };
}
function commentMarker(title) {
    return `<!-- flutter-test-action:${title.replace(/-->/gu, '')} -->`;
}
async function fetchChangedFiles(octokit, context) {
    if (!context.pullNumber)
        return [];
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullNumber,
        per_page: 100
    });
    return files
        .filter(file => file.status !== 'removed' && file.patch)
        .map(file => ({
        path: file.filename,
        addedLines: (0, diff_1.parseAddedLines)(file.patch ?? '')
    }));
}
async function createCheckRun(octokit, context, { name, conclusion, title, summary, text, annotations }) {
    const chunks = [];
    for (let i = 0; i < annotations.length; i += annotationsPerRequest) {
        chunks.push(annotations.slice(i, i + annotationsPerRequest));
    }
    const output = { title, summary, text };
    const { data } = await octokit.rest.checks.create({
        owner: context.owner,
        repo: context.repo,
        name,
        head_sha: context.sha,
        status: 'completed',
        conclusion,
        output: { ...output, annotations: chunks[0] ?? [] }
    });
    for (const chunk of chunks.slice(1)) {
        await octokit.rest.checks.update({
            owner: context.owner,
            repo: context.repo,
            check_run_id: data.id,
            output: { ...output, annotations: chunk }
        });
    }
    return data.html_url ?? undefined;
}
/**
 * Creates the pull request comment for this title, or updates the one created
 * by a previous run.
 */
async function upsertComment(octokit, context, title, body) {
    if (!context.pullNumber)
        return 'skipped';
    const marker = commentMarker(title);
    const fullBody = `${marker}\n${body}`;
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        per_page: 100
    });
    const existing = comments.find(comment => comment.body?.split('\n', 1)[0] === marker);
    if (existing) {
        await octokit.rest.issues.updateComment({
            owner: context.owner,
            repo: context.repo,
            comment_id: existing.id,
            body: fullBody
        });
        return 'updated';
    }
    await octokit.rest.issues.createComment({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        body: fullBody
    });
    return 'created';
}


/***/ }),

/***/ 7353:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.run = run;
const os_1 = __importDefault(__nccwpck_require__(857));
const path_1 = __importDefault(__nccwpck_require__(6928));
const fs_1 = __nccwpck_require__(9896);
const coverage_1 = __nccwpck_require__(7474);
const parser_1 = __nccwpck_require__(4883);
const runner_1 = __nccwpck_require__(562);
const paths_1 = __nccwpck_require__(5782);
const diff_1 = __nccwpck_require__(2371);
const build_1 = __nccwpck_require__(6749);
const markdown_1 = __nccwpck_require__(7148);
const annotations_1 = __nccwpck_require__(7911);
const format_1 = __nccwpck_require__(8998);
const github_1 = __nccwpck_require__(4171);
function parseThreshold(name, value) {
    if (value.trim() === '')
        return undefined;
    const threshold = Number(value);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw new Error(`${name} must be a number between 0 and 100.`);
    }
    return threshold;
}
function parseBoolean(name, value, fallback) {
    const normalized = value.trim().toLowerCase();
    if (normalized === '')
        return fallback;
    if (normalized === 'true')
        return true;
    if (normalized === 'false')
        return false;
    throw new Error(`${name} must be true or false.`);
}
function readInputs(core) {
    const input = (name) => core.getInput(name);
    return {
        workingDirectory: input('workingDirectory') || '.',
        testArgs: input('testArgs'),
        flutterCommand: input('flutterCommand') || 'flutter',
        coverage: parseBoolean('coverage', input('coverage'), false),
        coverageThreshold: parseThreshold('coverageThreshold', input('coverageThreshold')),
        changedLinesCoverageThreshold: parseThreshold('changedLinesCoverageThreshold', input('changedLinesCoverageThreshold')),
        annotateUncoveredLines: parseBoolean('annotateUncoveredLines', input('annotateUncoveredLines'), true),
        machinePath: input('machinePath'),
        coveragePath: input('coveragePath'),
        failOnError: parseBoolean('failOnError', input('failOnError'), true),
        title: input('title') || 'Flutter test results',
        token: input('token')
    };
}
async function run() {
    const core = await Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(475), __nccwpck_require__.e(383)]).then(__nccwpck_require__.bind(__nccwpck_require__, 2383));
    try {
        const inputs = readInputs(core);
        const paths = (0, paths_1.createPathContext)(inputs.workingDirectory);
        let machinePath = inputs.machinePath;
        let coveragePath = inputs.coveragePath;
        let exitCode;
        let stderrTail = [];
        // With neither file given, run the tests. Otherwise only report.
        if (!machinePath && !coveragePath) {
            const result = await (0, runner_1.runFlutterTest)({
                flutterCommand: inputs.flutterCommand,
                workingDirectory: inputs.workingDirectory,
                testArgs: inputs.testArgs,
                coverage: inputs.coverage,
                outputPath: path_1.default.join(process.env['RUNNER_TEMP'] || os_1.default.tmpdir(), `flutter-test-machine-${Date.now()}.json`)
            });
            exitCode = result.exitCode;
            stderrTail = result.stderrTail;
            machinePath = result.machinePath;
            coveragePath = result.coveragePath ?? '';
            core.setOutput('exit-code', exitCode.toString());
            core.setOutput('machine-path', machinePath);
        }
        let testRun;
        if (machinePath) {
            const parsed = await (0, parser_1.parseMachineFile)(machinePath);
            testRun = parsed.run;
            if (parsed.invalidLines > 0) {
                core.debug(`Skipped ${parsed.invalidLines} lines that were not JSON.`);
            }
        }
        const coverage = coveragePath
            ? await (0, coverage_1.parseLcovFile)(coveragePath)
            : undefined;
        // The context gives the links in the report even without a token.
        const github = await Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(573)]).then(__nccwpck_require__.bind(__nccwpck_require__, 2573));
        const context = (0, github_1.readContext)(github);
        const octokit = inputs.token ? github.getOctokit(inputs.token) : undefined;
        let changedLines;
        if (octokit && context.pullNumber && coverage) {
            try {
                const files = await (0, github_1.fetchChangedFiles)(octokit, context);
                changedLines = (0, diff_1.computeChangedLinesCoverage)(files, coverage, paths);
            }
            catch (error) {
                core.warning(`Could not read the changed files of the pull request: ${error.message}`);
            }
        }
        const report = (0, build_1.buildReport)({
            title: inputs.title,
            run: testRun,
            coverage,
            changedLines,
            exitCode,
            stderrTail,
            coverageThreshold: inputs.coverageThreshold,
            changedLinesCoverageThreshold: inputs.changedLinesCoverageThreshold,
            paths,
            links: context.links
        });
        setOutputs(core, report);
        logReport(core, report);
        await writeStepSummary(core, report);
        if (octokit) {
            await publish(core, octokit, context, report, inputs);
        }
        else {
            core.info('Skipping the check run and pull request comment because no token was provided.');
        }
        if (report.conclusion === 'failure') {
            if (inputs.failOnError) {
                core.setFailed(failureMessage(report));
            }
            else {
                core.warning(failureMessage(report));
            }
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
}
async function publish(core, octokit, context, report, inputs) {
    // The comment links to the check run, so create the check run first.
    try {
        const checkRunUrl = await (0, github_1.createCheckRun)(octokit, context, {
            name: inputs.title,
            conclusion: report.conclusion,
            title: checkTitle(report),
            summary: (0, markdown_1.renderCheckSummary)(report),
            text: (0, markdown_1.renderCheckText)(report),
            annotations: (0, annotations_1.buildAnnotations)(report, {
                annotateUncoveredLines: inputs.annotateUncoveredLines
            })
        });
        if (checkRunUrl) {
            report.links = { ...context.links, checkRunUrl };
            core.setOutput('check-run-url', checkRunUrl);
        }
    }
    catch (error) {
        core.warning(`Could not create the check run. Grant "checks: write" to the job to enable it. ${error.message}`);
    }
    if (!context.pullNumber) {
        core.info('Skipping the pull request comment because the workflow is not running for a pull request.');
        return;
    }
    try {
        await (0, github_1.upsertComment)(octokit, context, inputs.title, (0, markdown_1.renderComment)(report));
    }
    catch (error) {
        core.warning(`Could not write the pull request comment. Grant "pull-requests: write" to the job to enable it. ${error.message}`);
    }
}
function checkTitle(report) {
    const parts = [];
    if (report.tests) {
        if (report.tests.failed > 0)
            parts.push(`${report.tests.failed} failed`);
        if (report.tests.loadFailures.length > 0) {
            parts.push(`${report.tests.loadFailures.length} failed to load`);
        }
        parts.push(`${report.tests.passed} passed`);
        if (report.tests.skipped > 0)
            parts.push(`${report.tests.skipped} skipped`);
    }
    if (report.coverage?.lines.percent !== undefined) {
        parts.push(`coverage ${report.coverage.lines.percent.toFixed(1)}%`);
    }
    return parts.join(', ') || report.title;
}
function failureMessage(report) {
    const reasons = [];
    if (report.tests && report.tests.failed > 0) {
        reasons.push(`${report.tests.failed} test(s) failed.`);
    }
    if (report.tests && report.tests.loadFailures.length > 0) {
        reasons.push(`${report.tests.loadFailures.length} test file(s) failed to load.`);
    }
    reasons.push(...report.problems.map(p => p.replace(/`/gu, '')));
    return reasons.join(' ');
}
function setOutputs(core, report) {
    core.setOutput('conclusion', report.conclusion);
    if (report.tests) {
        core.setOutput('tests', report.tests.total.toString());
        core.setOutput('passed', report.tests.passed.toString());
        core.setOutput('failed', report.tests.failed.toString());
        core.setOutput('skipped', report.tests.skipped.toString());
        core.setOutput('duration', Math.round(report.tests.durationMs).toString());
    }
    if (report.coverage) {
        core.setOutput('coverage', report.coverage.lines.percent?.toFixed(1) ?? '');
        core.setOutput('coverage-hit', report.coverage.lines.hit.toString());
        core.setOutput('coverage-found', report.coverage.lines.found.toString());
    }
    if (report.changedLines) {
        core.setOutput('changed-lines-coverage', report.changedLines.percent?.toFixed(1) ?? '');
    }
}
function logReport(core, report) {
    const tests = report.tests;
    if (tests) {
        core.info(`${tests.failed} failed, ${tests.passed} passed, ${tests.skipped} skipped in ${(0, format_1.formatDuration)(tests.durationMs)}.`);
        for (const failure of tests.failures) {
            const location = `${failure.displayPath}${failure.line ? `:${failure.line}` : ''}`;
            core.startGroup(`❌ ${failure.name} (${location})`);
            const { messages, output } = (0, markdown_1.failureDetails)(failure.test);
            for (const message of messages) {
                core.info(message.text);
                if (message.stackTrace)
                    core.info(message.stackTrace);
            }
            if (output.length > 0)
                core.info(`Output:\n${output.join('\n')}`);
            core.endGroup();
        }
        for (const failure of tests.loadFailures) {
            core.startGroup(`💥 Failed to load ${failure.displayPath}`);
            for (const error of failure.errors) {
                core.info((0, format_1.cleanErrorMessage)(error.message));
            }
            core.endGroup();
        }
    }
}
async function writeStepSummary(core, report) {
    const summaryPath = process.env['GITHUB_STEP_SUMMARY'];
    if (!summaryPath)
        return;
    try {
        await fs_1.promises.appendFile(summaryPath, `${(0, markdown_1.renderStepSummary)(report)}\n\n`, 'utf8');
    }
    catch (error) {
        core.warning(`Could not write the step summary: ${error.message}`);
    }
}
run();


/***/ }),

/***/ 4883:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseMachineFile = parseMachineFile;
exports.parseMachineOutput = parseMachineOutput;
const fs_1 = __nccwpck_require__(9896);
async function parseMachineFile(path) {
    const content = await fs_1.promises.readFile(path, 'utf8');
    return parseMachineOutput(content);
}
/**
 * Builds a test run from the JSON lines written by `flutter test --machine`.
 *
 * @see https://github.com/dart-lang/test/blob/master/pkgs/test/doc/json_reporter.md
 */
function parseMachineOutput(content) {
    const suites = new Map();
    const groupNames = new Map();
    const tests = new Map();
    const run = { suites: [] };
    let invalidLines = 0;
    for (const line of content.split(/\r?\n/u)) {
        if (line.trim().length === 0)
            continue;
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            invalidLines++;
            continue;
        }
        // Flutter also writes `[{"event": ...}]` lines for the daemon protocol.
        if (event === null || typeof event !== 'object' || Array.isArray(event)) {
            continue;
        }
        switch (event['type']) {
            case 'suite': {
                const suite = event['suite'];
                suites.set(suite['id'], {
                    id: suite['id'],
                    path: suite['path'] ?? '',
                    platform: suite['platform'] ?? '',
                    tests: [],
                    loadErrors: []
                });
                break;
            }
            case 'group': {
                const group = event['group'];
                groupNames.set(group['id'], group['name'] ?? '');
                break;
            }
            case 'testStart': {
                const test = event['test'];
                tests.set(test['id'], {
                    id: test['id'],
                    suiteId: test['suiteID'],
                    groupIds: test['groupIDs'] ?? [],
                    name: test['name'] ?? '',
                    url: test['url'] ?? undefined,
                    line: test['line'] ?? undefined,
                    rootUrl: test['root_url'] ?? undefined,
                    rootLine: test['root_line'] ?? undefined,
                    skipReason: test['metadata']?.['skipReason'] ?? undefined,
                    startTime: event['time'] ?? 0,
                    errors: [],
                    prints: []
                });
                break;
            }
            case 'error': {
                tests.get(event['testID'])?.errors.push({
                    message: event['error'] ?? '',
                    stackTrace: event['stackTrace'] ?? '',
                    isFailure: event['isFailure'] === true
                });
                break;
            }
            case 'print': {
                tests.get(event['testID'])?.prints.push(event['message'] ?? '');
                break;
            }
            case 'testDone': {
                const test = tests.get(event['testID']);
                if (test) {
                    test.done = {
                        result: event['result'],
                        skipped: event['skipped'] === true,
                        hidden: event['hidden'] === true,
                        time: event['time'] ?? test.startTime
                    };
                }
                break;
            }
            case 'done': {
                run.success = event['success'] ?? undefined;
                run.durationMs = event['time'] ?? undefined;
                break;
            }
        }
    }
    for (const pending of tests.values()) {
        const suite = suites.get(pending.suiteId);
        if (!suite)
            continue;
        const status = toStatus(pending);
        // Hidden tests are the synthetic "loading <path>" test and setUpAll /
        // tearDownAll. They only matter when they fail.
        const hidden = pending.done?.hidden ?? pending.groupIds.length === 0;
        if (hidden && status !== 'failure')
            continue;
        if (pending.groupIds.length === 0 && pending.name.startsWith('loading ')) {
            suite.loadErrors.push(...withFallbackError(pending));
            continue;
        }
        suite.tests.push(toTestCase(pending, status, groupNames));
    }
    run.suites = [...suites.values()];
    return { run, invalidLines };
}
function toStatus(test) {
    if (!test.done)
        return 'failure';
    if (test.done.result !== 'success')
        return 'failure';
    return test.done.skipped ? 'skipped' : 'success';
}
function withFallbackError(test) {
    if (test.errors.length > 0)
        return test.errors;
    const message = test.done
        ? `The test finished with result "${test.done.result}".`
        : 'The test did not finish. The test process may have crashed or timed out.';
    return [{ message, stackTrace: '', isFailure: false }];
}
function toTestCase(test, status, groupNames) {
    const innermostGroup = test.groupIds[test.groupIds.length - 1];
    const groupName = innermostGroup !== undefined ? groupNames.get(innermostGroup) : undefined;
    // Tests written with helpers such as testWidgets report the helper's
    // location in `url` and the caller's location in `root_url`.
    const url = test.rootUrl ?? test.url;
    const line = test.rootUrl ? test.rootLine : test.line;
    return {
        id: test.id,
        suiteId: test.suiteId,
        name: test.name,
        groupName: groupName || undefined,
        location: url ? { url, line } : undefined,
        status,
        durationMs: Math.max(0, (test.done?.time ?? test.startTime) - test.startTime),
        skipReason: status === 'skipped' ? test.skipReason : undefined,
        errors: status === 'failure' ? withFallbackError(test) : test.errors,
        prints: test.prints
    };
}


/***/ }),

/***/ 5782:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createPathContext = createPathContext;
exports.toRepoPath = toRepoPath;
exports.displayPath = displayPath;
const path_1 = __importDefault(__nccwpck_require__(6928));
const url_1 = __nccwpck_require__(7016);
function createPathContext(workingDirectory, workspace = process.env['GITHUB_WORKSPACE'] || process.cwd()) {
    const absolute = path_1.default.resolve(workspace, workingDirectory || '.');
    return {
        workspace,
        workingDirectory: toPosix(path_1.default.relative(workspace, absolute))
    };
}
/**
 * Converts a path or URL from the machine output or lcov.info into a path
 * relative to the repository root. Returns undefined for locations outside of
 * the repository, such as `package:flutter_test/...`.
 */
function toRepoPath(location, context) {
    let filePath = location;
    if (location.startsWith('file://')) {
        filePath = (0, url_1.fileURLToPath)(location);
    }
    else if (/^[a-z][a-z0-9+.-]*:/iu.test(location) &&
        !isWindowsPath(location)) {
        return undefined;
    }
    const absolute = path_1.default.isAbsolute(filePath)
        ? filePath
        : path_1.default.resolve(context.workspace, context.workingDirectory, filePath);
    const relative = path_1.default.relative(context.workspace, absolute);
    if (relative.startsWith('..') || path_1.default.isAbsolute(relative)) {
        return undefined;
    }
    return toPosix(relative);
}
/**
 * Path for display: relative to the repository when possible, otherwise the
 * original value without the file:// scheme.
 */
function displayPath(location, context) {
    const repoPath = toRepoPath(location, context);
    if (repoPath)
        return repoPath;
    return location.startsWith('file://') ? (0, url_1.fileURLToPath)(location) : location;
}
function isWindowsPath(value) {
    return /^[a-z]:[\\/]/iu.test(value);
}
function toPosix(value) {
    return value.split(path_1.default.sep).join('/');
}


/***/ }),

/***/ 7911:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildAnnotations = buildAnnotations;
const markdown_1 = __nccwpck_require__(7148);
const format_1 = __nccwpck_require__(8998);
const maxMessageChars = 4000;
const maxDetailsChars = 20000;
function buildAnnotations(report, { annotateUncoveredLines }) {
    const annotations = [];
    for (const failure of report.tests?.failures ?? []) {
        if (!failure.path)
            continue;
        const { messages, output } = (0, markdown_1.failureDetails)(failure.test);
        const line = failure.line ?? 1;
        const rawDetails = [
            messages.map(m => m.stackTrace.trim()).find(Boolean),
            output.length > 0 ? `Output:\n${output.join('\n')}` : undefined
        ]
            .filter(Boolean)
            .join('\n\n');
        annotations.push({
            path: failure.path,
            start_line: line,
            end_line: line,
            annotation_level: 'failure',
            title: (0, format_1.truncateChars)(failure.name, 255),
            message: (0, format_1.truncateChars)(messages.map(m => m.text).join('\n\n') || 'Test failed.', maxMessageChars),
            raw_details: rawDetails
                ? (0, format_1.truncateChars)(rawDetails, maxDetailsChars)
                : undefined
        });
    }
    for (const failure of report.tests?.loadFailures ?? []) {
        if (!failure.path)
            continue;
        annotations.push({
            path: failure.path,
            start_line: 1,
            end_line: 1,
            annotation_level: 'failure',
            title: 'Failed to load the test file',
            message: (0, format_1.truncateChars)(failure.errors.map(e => (0, format_1.cleanErrorMessage)(e.message)).join('\n\n'), maxMessageChars)
        });
    }
    if (annotateUncoveredLines) {
        for (const file of report.changedLines?.data.files ?? []) {
            for (const range of file.uncovered) {
                annotations.push({
                    path: file.path,
                    start_line: range.start,
                    end_line: range.end,
                    annotation_level: 'notice',
                    title: 'Not covered by tests',
                    message: range.start === range.end
                        ? `Changed line ${range.start} is not covered by tests.`
                        : `Changed lines ${range.start}-${range.end} are not covered by tests.`
                });
            }
        }
    }
    return annotations;
}


/***/ }),

/***/ 6749:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildReport = buildReport;
exports.displayName = displayName;
const paths_1 = __nccwpck_require__(5782);
const coverage_1 = __nccwpck_require__(7474);
const format_1 = __nccwpck_require__(8998);
const slowestCount = 10;
function buildReport(input) {
    const tests = input.run ? buildTestReport(input.run, input.paths) : undefined;
    const coverage = input.coverage
        ? buildCoverageReport(input.coverage, input.paths, input.coverageThreshold)
        : undefined;
    const changedLines = input.changedLines
        ? buildChangedLinesReport(input.changedLines, input.changedLinesCoverageThreshold)
        : undefined;
    const problems = [];
    if (tests) {
        const hasFailures = tests.failed > 0 || tests.loadFailures.length > 0;
        if (input.exitCode !== undefined && input.exitCode !== 0 && !hasFailures) {
            problems.push(`\`flutter test\` exited with code ${input.exitCode}, but no failed test was found in its output.`);
        }
        else if (tests.total === 0 && !hasFailures) {
            problems.push('No tests were found.');
        }
        else if (input.run?.success === undefined && !hasFailures) {
            problems.push('The test output ended before the run finished. The test process may have been interrupted.');
        }
    }
    if (coverage && !coverage.passed) {
        problems.push(`Coverage ${(0, format_1.formatPercent)(coverage.lines.percent)} is below the threshold of ${coverage.threshold}%.`);
    }
    if (changedLines && !changedLines.passed) {
        problems.push(`Coverage of changed lines ${(0, format_1.formatPercent)(changedLines.percent)} is below the threshold of ${changedLines.threshold}%.`);
    }
    if (!tests && !coverage) {
        problems.push('There were no test results or coverage to report.');
    }
    const testsFailed = tests !== undefined && (tests.failed > 0 || tests.loadFailures.length > 0);
    return {
        title: input.title,
        conclusion: testsFailed || problems.length > 0 ? 'failure' : 'success',
        problems,
        tests,
        coverage,
        changedLines,
        exitCode: input.exitCode,
        stderrTail: input.stderrTail ?? [],
        links: input.links
    };
}
function displayName(test) {
    const group = test.groupName;
    if (group && test.name.startsWith(`${group} `)) {
        return `${group} › ${test.name.substring(group.length + 1)}`;
    }
    return test.name;
}
function buildTestReport(run, paths) {
    const reported = [];
    const files = [];
    const loadFailures = [];
    for (const suite of run.suites) {
        const suitePath = (0, paths_1.toRepoPath)(suite.path, paths);
        const suiteDisplayPath = (0, paths_1.displayPath)(suite.path, paths);
        if (suite.loadErrors.length > 0) {
            loadFailures.push({
                path: suitePath,
                displayPath: suiteDisplayPath,
                errors: suite.loadErrors
            });
        }
        for (const test of suite.tests) {
            reported.push(toReportedTest(test, suite, paths));
        }
        if (suite.tests.length > 0) {
            files.push({
                path: suitePath,
                displayPath: suiteDisplayPath,
                total: suite.tests.length,
                passed: count(suite.tests, 'success'),
                failed: count(suite.tests, 'failure'),
                skipped: count(suite.tests, 'skipped'),
                durationMs: suite.tests.reduce((sum, t) => sum + t.durationMs, 0)
            });
        }
    }
    files.sort((a, b) => Number(b.failed > 0) - Number(a.failed > 0) ||
        b.durationMs - a.durationMs ||
        a.displayPath.localeCompare(b.displayPath));
    const all = reported.map(r => r.test);
    const sumOfTests = all.reduce((sum, t) => sum + t.durationMs, 0);
    return {
        total: all.length,
        passed: count(all, 'success'),
        failed: count(all, 'failure'),
        skipped: count(all, 'skipped'),
        durationMs: run.durationMs ?? sumOfTests,
        failures: reported.filter(r => r.test.status === 'failure'),
        loadFailures,
        skippedTests: reported.filter(r => r.test.status === 'skipped'),
        slowest: reported
            .filter(r => r.test.status !== 'skipped')
            .sort((a, b) => b.test.durationMs - a.test.durationMs)
            .slice(0, slowestCount),
        files
    };
}
function toReportedTest(test, suite, paths) {
    const locationPath = test.location
        ? (0, paths_1.toRepoPath)(test.location.url, paths)
        : undefined;
    const suitePath = (0, paths_1.toRepoPath)(suite.path, paths);
    // Prefer the location of the test definition. When it is outside the
    // repository (for example inside a package), fall back to the test file.
    if (locationPath || !suitePath) {
        return {
            test,
            name: displayName(test),
            path: locationPath,
            displayPath: test.location
                ? (0, paths_1.displayPath)(test.location.url, paths)
                : (0, paths_1.displayPath)(suite.path, paths),
            line: locationPath ? test.location?.line : undefined
        };
    }
    return {
        test,
        name: displayName(test),
        path: suitePath,
        displayPath: suitePath
    };
}
function count(tests, status) {
    return tests.filter(t => t.status === status).length;
}
function buildCoverageReport(data, paths, threshold) {
    const withPercent = (c) => ({
        ...c,
        percent: (0, coverage_1.percentage)(c)
    });
    const ratio = data.lines.found > 0 ? (data.lines.hit / data.lines.found) * 100 : 0;
    return {
        lines: withPercent(data.lines),
        functions: withPercent(data.functions),
        branches: withPercent(data.branches),
        threshold,
        passed: threshold === undefined || ratio >= threshold,
        files: data.files
            .filter(file => file.lines.found > 0)
            .map(file => ({
            path: (0, paths_1.toRepoPath)(file.path, paths),
            displayPath: (0, paths_1.displayPath)(file.path, paths),
            hit: file.lines.hit,
            found: file.lines.found,
            percent: (0, coverage_1.percentage)(file.lines)
        }))
            .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0) ||
            b.found - b.hit - (a.found - a.hit))
    };
}
function buildChangedLinesReport(data, threshold) {
    const ratio = data.total > 0 ? (data.covered / data.total) * 100 : undefined;
    return {
        data,
        percent: (0, coverage_1.percentage)({ hit: data.covered, found: data.total }),
        threshold,
        passed: threshold === undefined || ratio === undefined || ratio >= threshold
    };
}


/***/ }),

/***/ 8998:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.formatDuration = formatDuration;
exports.formatNumber = formatNumber;
exports.formatPercent = formatPercent;
exports.escapeMarkdown = escapeMarkdown;
exports.codeBlock = codeBlock;
exports.details = details;
exports.truncateText = truncateText;
exports.truncateChars = truncateChars;
exports.projectFrames = projectFrames;
exports.exceptionStack = exceptionStack;
exports.isSeeLogsMessage = isSeeLogsMessage;
exports.splitExceptionReports = splitExceptionReports;
exports.cleanErrorMessage = cleanErrorMessage;
exports.blobUrl = blobUrl;
exports.commitUrl = commitUrl;
function formatDuration(ms) {
    if (ms < 1000)
        return `${Math.round(ms)} ms`;
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)} s`;
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds - minutes * 60);
    return `${minutes}m ${rest}s`;
}
function formatNumber(value) {
    return value.toLocaleString('en-US');
}
function formatPercent(value) {
    return value === undefined ? 'n/a' : `${value.toFixed(1)}%`;
}
/**
 * Escapes text for inline Markdown, including table cells.
 */
function escapeMarkdown(text) {
    return text.replace(/[\\`*_[\]<>|~#]/gu, match => `\\${match}`);
}
/**
 * Wraps text in a fenced code block that cannot be closed by the content.
 */
function codeBlock(text, language = 'text') {
    const longestFence = Math.max(2, ...[...text.matchAll(/`{3,}/gu)].map(match => match[0].length));
    const fence = '`'.repeat(longestFence + 1);
    return `${fence}${language}\n${text}\n${fence}`;
}
function details(summary, body) {
    return `<details><summary>${summary}</summary>\n\n${body}\n\n</details>`;
}
/**
 * Truncates text to a number of lines and characters, noting what was cut.
 */
function truncateText(text, maxLines, maxChars = Number.POSITIVE_INFINITY) {
    const lines = text.split('\n');
    let result = lines.slice(0, maxLines).join('\n');
    let truncated = lines.length > maxLines;
    if (result.length > maxChars) {
        result = result.substring(0, maxChars);
        truncated = true;
    }
    return truncated ? `${result}\n… (truncated)` : result;
}
function truncateChars(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    return `${text.substring(0, Math.max(0, maxChars - 15))}\n… (truncated)`;
}
const frameworkFrame = /(^|\(|\s)(dart:|package:(flutter|flutter_test|test|test_api|test_core|stack_trace|matcher|fake_async|async)(\/|\s|$))/u;
/**
 * Keeps the stack frames that point to the project, dropping the Dart SDK,
 * Flutter and the test framework.
 */
function projectFrames(stackTrace) {
    return stackTrace
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.length > 0 &&
        !frameworkFrame.test(line.trim()) &&
        !line.startsWith('===== asynchronous gap') &&
        !line.includes('<asynchronous suspension>') &&
        !/^\(elided /u.test(line.trim()))
        .join('\n');
}
/**
 * Returns the stack frames listed in a Flutter exception report under "When
 * the exception was thrown, this was the stack:".
 */
function exceptionStack(report) {
    const frames = [];
    let inStack = false;
    for (const line of report.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === 'When the exception was thrown, this was the stack:') {
            inStack = true;
            continue;
        }
        if (!inStack)
            continue;
        if (/^#\d+\s/u.test(trimmed) ||
            trimmed.startsWith('<asynchronous') ||
            /^\(elided /u.test(trimmed)) {
            frames.push(trimmed);
            continue;
        }
        break;
    }
    return frames.join('\n');
}
const seeLogsMessage = /^Test failed\. See exception logs above\./u;
const exceptionHeader = /^══╡ EXCEPTION CAUGHT BY .* ╞═+$/u;
const exceptionFooter = /^═{10,}$/u;
function isSeeLogsMessage(message) {
    return seeLogsMessage.test(message.trim());
}
/**
 * Splits the print output of a test into the exception reports written by the
 * Flutter test framework and the remaining output.
 */
function splitExceptionReports(prints) {
    const exceptions = [];
    const output = [];
    let current;
    for (const line of prints.join('\n').split('\n')) {
        if (exceptionHeader.test(line)) {
            current = [line];
            continue;
        }
        if (current) {
            current.push(line);
            if (exceptionFooter.test(line)) {
                exceptions.push(current.join('\n'));
                current = undefined;
            }
            continue;
        }
        output.push(line);
    }
    if (current)
        exceptions.push(current.join('\n'));
    return {
        exceptions,
        output: output.join('\n').trim() ? output : []
    };
}
/**
 * Removes decoration and repeated information from an error message, keeping
 * the lines that explain the failure (Expected / Actual and so on).
 */
function cleanErrorMessage(message) {
    const result = [];
    let skipping;
    for (const line of message.split('\n')) {
        const trimmed = line.trim();
        if (exceptionHeader.test(trimmed) || exceptionFooter.test(trimmed)) {
            continue;
        }
        if (trimmed === 'When the exception was thrown, this was the stack:') {
            skipping = 'stack';
            continue;
        }
        if (trimmed === 'The test description was:') {
            skipping = 'description';
            continue;
        }
        if (skipping === 'stack') {
            if (/^#\d+\s/u.test(trimmed) || /^\(elided /u.test(trimmed))
                continue;
            if (trimmed === '' || trimmed.startsWith('<asynchronous'))
                continue;
            skipping = undefined;
        }
        if (skipping === 'description') {
            // The description is the indented test name on the next line.
            skipping = undefined;
            if (line.startsWith('  '))
                continue;
        }
        result.push(line.trimEnd());
    }
    return result
        .join('\n')
        .replace(/\n{3,}/gu, '\n\n')
        .trim();
}
function blobUrl(links, path, start, end) {
    if (!links || !links.owner || !links.repo || !links.sha)
        return undefined;
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    let url = `${links.serverUrl}/${links.owner}/${links.repo}/blob/${links.sha}/${encoded}`;
    if (start !== undefined) {
        url += `#L${start}`;
        if (end !== undefined && end !== start)
            url += `-L${end}`;
    }
    return url;
}
function commitUrl(links) {
    if (!links || !links.owner || !links.repo || !links.sha)
        return undefined;
    return `${links.serverUrl}/${links.owner}/${links.repo}/commit/${links.sha}`;
}


/***/ }),

/***/ 7148:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.outputLimit = void 0;
exports.renderComment = renderComment;
exports.renderCheckSummary = renderCheckSummary;
exports.renderCheckText = renderCheckText;
exports.renderStepSummary = renderStepSummary;
exports.failureDetails = failureDetails;
const format_1 = __nccwpck_require__(8998);
// GitHub rejects comments and check run outputs longer than 65535 characters.
// Keep a margin for the comment marker and the omission note.
exports.outputLimit = 63000;
const maxDetailedFailuresInComment = 10;
const maxErrorsPerTest = 3;
const maxMessageLines = 30;
const maxMessageChars = 3000;
const maxStackLines = 30;
const maxOutputLines = 40;
const maxChangedFilesInComment = 20;
const maxLowestCoverageFiles = 20;
function renderComment(report) {
    return assemble([
        () => renderHeader(report),
        budget => renderFailures(report, budget, {
            maxDetailed: maxDetailedFailuresInComment,
            fullStack: false
        }),
        budget => renderLoadFailures(report, budget),
        () => renderChangedLines(report, maxChangedFilesInComment),
        () => renderSlowest(report),
        () => renderSkipped(report)
    ], renderFooter(report), omittedNote(report));
}
function renderCheckSummary(report) {
    return assemble([
        () => renderHeader(report),
        budget => renderFailures(report, budget, {
            maxDetailed: Number.POSITIVE_INFINITY,
            fullStack: true
        }),
        budget => renderLoadFailures(report, budget),
        () => renderChangedLines(report, maxChangedFilesInComment)
    ], renderMetadata(report), 'Some failures were omitted to fit the size limit of the check run.');
}
function renderCheckText(report) {
    return assemble([
        budget => renderTestFiles(report.tests, budget),
        () => renderSlowest(report),
        () => renderSkipped(report),
        budget => renderUncoveredChangedLines(report.changedLines, budget),
        () => renderLowestCoverage(report.coverage),
        () => renderStderr(report)
    ], '', 'Some sections were omitted to fit the size limit of the check run.');
}
function renderStepSummary(report) {
    return [renderCheckSummary(report), renderCheckText(report)]
        .filter(Boolean)
        .join('\n\n');
}
function assemble(sections, footer, omitted) {
    const reserved = footer.length + (omitted?.length ?? 0) + 8;
    const parts = [];
    let used = 0;
    let wasOmitted = false;
    for (const section of sections) {
        const budget = exports.outputLimit - reserved - used;
        const text = section(budget);
        if (!text)
            continue;
        if (text.length > budget) {
            wasOmitted = true;
            continue;
        }
        parts.push(text);
        used += text.length + 2;
    }
    if (wasOmitted && omitted)
        parts.push(omitted);
    if (footer)
        parts.push(footer);
    return parts.join('\n\n');
}
function renderHeader(report) {
    const icon = report.conclusion === 'success' ? '✅' : '❌';
    const lines = [`## ${icon} ${(0, format_1.escapeMarkdown)(report.title)}`, ''];
    if (report.tests) {
        lines.push(testCounts(report.tests));
    }
    const coverage = coverageCounts(report.coverage, report.changedLines);
    if (coverage) {
        if (report.tests)
            lines[lines.length - 1] += '  ';
        lines.push(coverage);
    }
    if (report.problems.length > 0) {
        lines.push('', '> [!CAUTION]');
        for (const problem of report.problems) {
            lines.push(`> ${problem}`);
        }
    }
    return lines.join('\n');
}
function testCounts(tests) {
    const parts = [];
    if (tests.failed > 0)
        parts.push(`**${(0, format_1.formatNumber)(tests.failed)} failed**`);
    if (tests.loadFailures.length > 0) {
        parts.push(`**${(0, format_1.formatNumber)(tests.loadFailures.length)} failed to load**`);
    }
    parts.push(`${(0, format_1.formatNumber)(tests.passed)} passed`);
    if (tests.skipped > 0)
        parts.push(`${(0, format_1.formatNumber)(tests.skipped)} skipped`);
    parts.push(`⏱ ${(0, format_1.formatDuration)(tests.durationMs)}`);
    return parts.join(' · ');
}
function coverageCounts(coverage, changedLines) {
    const parts = [];
    if (coverage) {
        let text = `Coverage **${(0, format_1.formatPercent)(coverage.lines.percent)}**`;
        if (coverage.threshold !== undefined) {
            text += ` (threshold ${coverage.threshold}%)`;
        }
        parts.push(text);
        if (coverage.functions.found > 0) {
            parts.push(`Functions ${(0, format_1.formatPercent)(coverage.functions.percent)}`);
        }
        if (coverage.branches.found > 0) {
            parts.push(`Branches ${(0, format_1.formatPercent)(coverage.branches.percent)}`);
        }
    }
    if (changedLines && changedLines.data.total > 0) {
        let text = `Changed lines **${(0, format_1.formatPercent)(changedLines.percent)}** (${(0, format_1.formatNumber)(changedLines.data.covered)}/${(0, format_1.formatNumber)(changedLines.data.total)})`;
        if (changedLines.threshold !== undefined) {
            text += ` (threshold ${changedLines.threshold}%)`;
        }
        parts.push(text);
    }
    return parts.length > 0 ? parts.join(' · ') : undefined;
}
function renderFailures(report, budget, options) {
    const failures = report.tests?.failures ?? [];
    if (failures.length === 0)
        return undefined;
    const parts = [`### ❌ Failed tests (${(0, format_1.formatNumber)(failures.length)})`];
    let used = parts[0].length;
    let index = 0;
    for (; index < failures.length && index < options.maxDetailed; index++) {
        const text = renderFailure(failures[index], report, options);
        // Leave room for listing the remaining failures by name.
        if (used + text.length + 2 > budget - 2000)
            break;
        parts.push(text);
        used += text.length + 2;
    }
    const rest = failures.slice(index);
    if (rest.length > 0) {
        const items = [];
        for (const failure of rest) {
            const item = `- ❌ **${(0, format_1.escapeMarkdown)(failure.name)}** — ${location(failure, report)}`;
            if (used + item.length + 100 > budget)
                break;
            items.push(item);
            used += item.length + 1;
        }
        if (items.length < rest.length) {
            items.push(`- …and ${(0, format_1.formatNumber)(rest.length - items.length)} more`);
        }
        parts.push(index > 0
            ? `Other failed tests:\n\n${items.join('\n')}`
            : items.join('\n'));
    }
    return parts.join('\n\n');
}
function renderFailure(failure, report, options) {
    const lines = [
        `#### ${(0, format_1.escapeMarkdown)(failure.name)}`,
        '',
        `${location(failure, report)} · ${(0, format_1.formatDuration)(failure.test.durationMs)}`
    ];
    const { messages, output } = failureDetails(failure.test);
    for (const message of messages.slice(0, maxErrorsPerTest)) {
        lines.push('', (0, format_1.codeBlock)((0, format_1.truncateText)(message.text, maxMessageLines, maxMessageChars)));
        const stack = options.fullStack
            ? message.stackTrace.trim()
            : (0, format_1.projectFrames)(message.stackTrace);
        if (stack) {
            lines.push('', (0, format_1.details)('Stack trace', (0, format_1.codeBlock)((0, format_1.truncateText)(stack, options.fullStack ? 100 : maxStackLines))));
        }
    }
    if (messages.length > maxErrorsPerTest) {
        lines.push('', `…and ${messages.length - maxErrorsPerTest} more errors`);
    }
    if (output.length > 0) {
        lines.push('', (0, format_1.details)(`Output (${(0, format_1.formatNumber)(output.length)} lines)`, (0, format_1.codeBlock)((0, format_1.truncateText)(output.join('\n'), maxOutputLines, 4000))));
    }
    return lines.join('\n');
}
/**
 * Picks the messages that explain a failure. For widget tests, Flutter prints
 * the exception and reports only "Test failed. See exception logs above.", so
 * the printed exception is used instead.
 */
function failureDetails(test) {
    const { exceptions, output } = (0, format_1.splitExceptionReports)(test.prints);
    const errors = test.errors.filter(e => !(0, format_1.isSeeLogsMessage)(e.message));
    const stackTrace = test.errors[0]?.stackTrace ?? '';
    const messages = errors.length > 0
        ? errors.map(e => ({
            text: (0, format_1.cleanErrorMessage)(e.message),
            stackTrace: e.stackTrace
        }))
        : exceptions.map(text => ({
            text: (0, format_1.cleanErrorMessage)(text),
            stackTrace: (0, format_1.exceptionStack)(text) || stackTrace
        }));
    if (messages.length === 0 && test.errors.length > 0) {
        messages.push({
            text: (0, format_1.cleanErrorMessage)(test.errors[0].message),
            stackTrace
        });
    }
    return {
        messages,
        output: errors.length > 0 && test.prints.length > 0
            ? test.prints.join('\n').split('\n')
            : output
    };
}
function renderLoadFailures(report, budget) {
    const failures = report.tests?.loadFailures ?? [];
    if (failures.length === 0)
        return undefined;
    const parts = [`### 💥 Failed to load (${(0, format_1.formatNumber)(failures.length)})`];
    let used = parts[0].length;
    for (const failure of failures) {
        const text = renderLoadFailure(failure, report);
        if (used + text.length + 2 > budget) {
            parts.push(`…and ${failures.length - parts.length + 1} more`);
            break;
        }
        parts.push(text);
        used += text.length + 2;
    }
    return parts.join('\n\n');
}
function renderLoadFailure(failure, report) {
    const url = failure.path ? (0, format_1.blobUrl)(report.links, failure.path) : undefined;
    const name = `\`${failure.displayPath}\``;
    const message = failure.errors
        .map(e => (0, format_1.cleanErrorMessage)(e.message))
        .join('\n\n');
    return [
        `#### ${url ? `[${name}](${url})` : name}`,
        '',
        (0, format_1.codeBlock)((0, format_1.truncateText)(message, maxMessageLines, maxMessageChars))
    ].join('\n');
}
function renderChangedLines(report, maxFiles) {
    const changed = report.changedLines?.data;
    if (!changed)
        return undefined;
    const withGaps = changed.files
        .filter(file => file.uncovered.length > 0)
        .sort((a, b) => b.total - b.covered - (a.total - a.covered));
    if (withGaps.length === 0 && changed.missingFiles.length === 0) {
        return undefined;
    }
    const lines = ['### 📉 Changed lines without coverage'];
    if (withGaps.length > 0) {
        lines.push('', '| File | Covered | Uncovered lines |', '| ---- | ----: | ---- |');
        for (const file of withGaps.slice(0, maxFiles)) {
            lines.push(`| ${fileLink(file.path, report)} | ${file.covered}/${file.total} (${(0, format_1.formatPercent)((file.covered / file.total) * 100)}) | ${ranges(file.path, file.uncovered, report, 5)} |`);
        }
        if (withGaps.length > maxFiles) {
            lines.push('', `…and ${withGaps.length - maxFiles} more files`);
        }
    }
    const fullyCovered = changed.files.length - withGaps.length;
    if (fullyCovered > 0) {
        lines.push('', `${(0, format_1.formatNumber)(fullyCovered)} other changed ${fullyCovered === 1 ? 'file is' : 'files are'} fully covered.`);
    }
    if (changed.missingFiles.length > 0) {
        lines.push('', `**Not loaded by any test** (these files are missing from the coverage report):`, '', ...changed.missingFiles
            .slice(0, maxFiles)
            .map(file => `- ${fileLink(file, report)}`));
        if (changed.missingFiles.length > maxFiles) {
            lines.push(`- …and ${changed.missingFiles.length - maxFiles} more`);
        }
    }
    return lines.join('\n');
}
function renderSlowest(report) {
    const slowest = report.tests?.slowest ?? [];
    if (slowest.length === 0)
        return undefined;
    const rows = slowest.map(test => `| ${(0, format_1.escapeMarkdown)(test.name)} | ${location(test, report)} | ${(0, format_1.formatDuration)(test.test.durationMs)} |`);
    return (0, format_1.details)(`🐢 Slowest tests (${slowest.length})`, ['| Test | File | Time |', '| ---- | ---- | ----: |', ...rows].join('\n'));
}
function renderSkipped(report) {
    const skipped = report.tests?.skippedTests ?? [];
    if (skipped.length === 0)
        return undefined;
    const items = skipped.slice(0, 50).map(test => {
        const reason = test.test.skipReason
            ? ` — ${(0, format_1.escapeMarkdown)(test.test.skipReason)}`
            : '';
        return `- ${(0, format_1.escapeMarkdown)(test.name)}${reason} (${location(test, report)})`;
    });
    if (skipped.length > 50)
        items.push(`- …and ${skipped.length - 50} more`);
    return (0, format_1.details)(`⏭ Skipped tests (${skipped.length})`, items.join('\n'));
}
function renderTestFiles(tests, budget) {
    if (!tests || tests.files.length === 0)
        return undefined;
    const lines = [
        '### Test files',
        '',
        '| File | Tests | ✅ | ❌ | ⏭ | Time |',
        '| ---- | ----: | ----: | ----: | ----: | ----: |'
    ];
    let used = lines.join('\n').length;
    let shown = 0;
    for (const file of tests.files) {
        const row = `| ${file.path ? `\`${file.path}\`` : `\`${file.displayPath}\``} | ${file.total} | ${file.passed} | ${file.failed} | ${file.skipped} | ${(0, format_1.formatDuration)(file.durationMs)} |`;
        if (used + row.length + 200 > budget)
            break;
        lines.push(row);
        used += row.length + 1;
        shown++;
    }
    if (shown < tests.files.length) {
        lines.push('', `…and ${tests.files.length - shown} more files`);
    }
    return lines.join('\n');
}
function renderUncoveredChangedLines(changedLines, budget) {
    const files = changedLines?.data.files.filter(f => f.uncovered.length > 0);
    if (!files || files.length === 0)
        return undefined;
    const lines = ['### Uncovered changed lines', ''];
    let used = lines.join('\n').length;
    for (const file of files) {
        const item = `- \`${file.path}\`: ${file.uncovered.map(formatRange).join(', ')}`;
        if (used + item.length + 100 > budget) {
            lines.push('- …');
            break;
        }
        lines.push(item);
        used += item.length + 1;
    }
    return lines.join('\n');
}
function renderLowestCoverage(coverage) {
    const files = coverage?.files.filter(file => file.hit < file.found) ?? [];
    if (files.length === 0)
        return undefined;
    const rows = files
        .slice(0, maxLowestCoverageFiles)
        .map(file => `| \`${file.path ?? file.displayPath}\` | ${file.hit}/${file.found} | ${(0, format_1.formatPercent)(file.percent)} |`);
    return [
        `### Lowest coverage files`,
        '',
        '| File | Lines | Coverage |',
        '| ---- | ----: | ----: |',
        ...rows
    ].join('\n');
}
function renderStderr(report) {
    if (report.stderrTail.length === 0)
        return undefined;
    if (report.exitCode === undefined || report.exitCode === 0)
        return undefined;
    return [
        `### stderr (last ${report.stderrTail.length} lines)`,
        '',
        (0, format_1.codeBlock)((0, format_1.truncateChars)(report.stderrTail.join('\n'), 8000))
    ].join('\n');
}
function renderFooter(report) {
    const links = [];
    if (report.links?.checkRunUrl) {
        links.push(`[Full report](${report.links.checkRunUrl})`);
    }
    const commit = (0, format_1.commitUrl)(report.links);
    if (commit && report.links) {
        links.push(`Commit [\`${report.links.sha.substring(0, 7)}\`](${commit})`);
    }
    if (report.links?.runUrl) {
        links.push(`[Workflow run](${report.links.runUrl})`);
    }
    return links.length > 0 ? `<sub>${links.join(' · ')}</sub>` : '';
}
function omittedNote(report) {
    const url = report.links?.checkRunUrl;
    return url
        ? `Some sections were omitted to fit the size limit. See the [full report](${url}).`
        : 'Some sections were omitted to fit the size limit. See the check run for the full report.';
}
function renderMetadata(report) {
    const data = {
        version: 1,
        conclusion: report.conclusion,
        tests: report.tests && {
            total: report.tests.total,
            passed: report.tests.passed,
            failed: report.tests.failed,
            skipped: report.tests.skipped,
            loadFailures: report.tests.loadFailures.length,
            durationMs: report.tests.durationMs
        },
        coverage: report.coverage && {
            hit: report.coverage.lines.hit,
            found: report.coverage.lines.found
        },
        changedLines: report.changedLines && {
            covered: report.changedLines.data.covered,
            total: report.changedLines.data.total
        }
    };
    return `<!-- flutter-test-action-data ${JSON.stringify(data)} -->`;
}
function location(test, report) {
    const label = `\`${test.displayPath}${test.line ? `:${test.line}` : ''}\``;
    const url = test.path
        ? (0, format_1.blobUrl)(report.links, test.path, test.line)
        : undefined;
    return url ? `[${label}](${url})` : label;
}
function fileLink(path, report) {
    const url = (0, format_1.blobUrl)(report.links, path);
    return url ? `[\`${path}\`](${url})` : `\`${path}\``;
}
function ranges(path, uncovered, report, max) {
    const items = uncovered.slice(0, max).map(range => {
        const url = (0, format_1.blobUrl)(report.links, path, range.start, range.end);
        return url ? `[${formatRange(range)}](${url})` : formatRange(range);
    });
    if (uncovered.length > max)
        items.push(`+${uncovered.length - max} more`);
    return items.join(', ');
}
function formatRange(range) {
    return range.start === range.end
        ? `L${range.start}`
        : `L${range.start}-${range.end}`;
}


/***/ }),

/***/ 562:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.testEnvironment = testEnvironment;
exports.buildCommandLine = buildCommandLine;
exports.runFlutterTest = runFlutterTest;
const fs_1 = __nccwpck_require__(9896);
const events_1 = __nccwpck_require__(4434);
const path_1 = __importDefault(__nccwpck_require__(6928));
const stderrTailSize = 50;
// Credentials the runner hands to JavaScript actions. A plain `run:` step does
// not receive them, so the tests should not either.
const secretEnvNames = new Set([
    'ACTIONS_RUNTIME_TOKEN',
    'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
    'ACTIONS_ID_TOKEN_REQUEST_URL'
]);
function testEnvironment(env = process.env) {
    const result = {};
    for (const [name, value] of Object.entries(env)) {
        if (value === undefined)
            continue;
        if (name.startsWith('INPUT_') || secretEnvNames.has(name))
            continue;
        result[name] = value;
    }
    return result;
}
function buildCommandLine(options) {
    const parts = [options.flutterCommand, 'test', '--machine'];
    if (options.coverage)
        parts.push('--coverage');
    if (options.testArgs.trim())
        parts.push(options.testArgs.trim());
    return parts.join(' ');
}
async function runFlutterTest(options) {
    const [core, { exec }] = await Promise.all([
        Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(475), __nccwpck_require__.e(383)]).then(__nccwpck_require__.bind(__nccwpck_require__, 2383)),
        __nccwpck_require__.e(/* import() */ 475).then(__nccwpck_require__.bind(__nccwpck_require__, 1475))
    ]);
    const cwd = path_1.default.resolve(options.workingDirectory || '.');
    const commandLine = buildCommandLine(options);
    const output = (0, fs_1.createWriteStream)(options.outputPath, { encoding: 'utf8' });
    const stderrTail = [];
    core.info(`Running: ${commandLine} (in ${cwd})`);
    let exitCode;
    try {
        exitCode = await exec(commandLine, [], {
            cwd,
            env: testEnvironment(),
            ignoreReturnCode: true,
            // The machine output is thousands of JSON lines. Only the plain output
            // is shown in the log.
            silent: true,
            listeners: {
                stdline: line => {
                    if (isJsonLine(line)) {
                        output.write(`${line}\n`);
                    }
                    else if (line.trim()) {
                        core.info(line);
                    }
                },
                errline: line => {
                    core.info(line);
                    stderrTail.push(line);
                    if (stderrTail.length > stderrTailSize)
                        stderrTail.shift();
                }
            }
        });
    }
    finally {
        output.end();
        await (0, events_1.once)(output, 'close');
    }
    let coveragePath;
    if (options.coverage) {
        const lcov = path_1.default.join(cwd, 'coverage', 'lcov.info');
        if ((0, fs_1.existsSync)(lcov)) {
            coveragePath = lcov;
        }
        else {
            core.warning(`Coverage was enabled, but ${lcov} was not created.`);
        }
    }
    return { exitCode, machinePath: options.outputPath, coveragePath, stderrTail };
}
function isJsonLine(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
        return false;
    try {
        JSON.parse(trimmed);
        return true;
    }
    catch {
        return false;
    }
}


/***/ }),

/***/ 2613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 5317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 6982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 4434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 8611:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 5692:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 9278:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 4589:
/***/ ((module) => {

"use strict";
module.exports = require("node:assert");

/***/ }),

/***/ 6698:
/***/ ((module) => {

"use strict";
module.exports = require("node:async_hooks");

/***/ }),

/***/ 4573:
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ 7540:
/***/ ((module) => {

"use strict";
module.exports = require("node:console");

/***/ }),

/***/ 7598:
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ 3053:
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ 610:
/***/ ((module) => {

"use strict";
module.exports = require("node:dns");

/***/ }),

/***/ 8474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 7067:
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ 2467:
/***/ ((module) => {

"use strict";
module.exports = require("node:http2");

/***/ }),

/***/ 7030:
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ 643:
/***/ ((module) => {

"use strict";
module.exports = require("node:perf_hooks");

/***/ }),

/***/ 1792:
/***/ ((module) => {

"use strict";
module.exports = require("node:querystring");

/***/ }),

/***/ 7075:
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 1692:
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ 3136:
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ 7975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 3429:
/***/ ((module) => {

"use strict";
module.exports = require("node:util/types");

/***/ }),

/***/ 5919:
/***/ ((module) => {

"use strict";
module.exports = require("node:worker_threads");

/***/ }),

/***/ 8522:
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 3193:
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ 3557:
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ 4756:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 7016:
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ 9023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__nccwpck_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__nccwpck_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__nccwpck_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__nccwpck_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__nccwpck_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__nccwpck_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__nccwpck_require__.f).reduce((promises, key) => {
/******/ 				__nccwpck_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__nccwpck_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			792: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__nccwpck_require__.o(moreModules, moduleId)) {
/******/ 					__nccwpck_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__nccwpck_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__nccwpck_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __nccwpck_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(7353);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map