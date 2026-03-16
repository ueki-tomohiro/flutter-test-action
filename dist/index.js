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

/***/ 5313:
/***/ (function(module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const xml_parser_xo_1 = __importDefault(__nccwpck_require__(8603));
function newLine(state) {
    if (!state.options.indentation && !state.options.lineSeparator)
        return;
    state.content += state.options.lineSeparator;
    let i;
    for (i = 0; i < state.level; i++) {
        state.content += state.options.indentation;
    }
}
function indent(state) {
    state.content = state.content.replace(/ +$/, '');
    let i;
    for (i = 0; i < state.level; i++) {
        state.content += state.options.indentation;
    }
}
function appendContent(state, content) {
    state.content += content;
}
function processNode(node, state, preserveSpace) {
    if (node.type === 'Element') {
        processElementNode(node, state, preserveSpace);
    }
    else if (node.type === 'ProcessingInstruction') {
        processProcessingIntruction(node, state);
    }
    else if (typeof node.content === 'string') {
        processContent(node.content, state, preserveSpace);
    }
    else {
        throw new Error('Unknown node type: ' + node.type);
    }
}
function processContent(content, state, preserveSpace) {
    if (!preserveSpace) {
        const trimmedContent = content.trim();
        if (state.options.lineSeparator) {
            content = trimmedContent;
        }
        else if (trimmedContent.length === 0) {
            content = trimmedContent;
        }
    }
    if (content.length > 0) {
        if (!preserveSpace && state.content.length > 0) {
            newLine(state);
        }
        appendContent(state, content);
    }
}
function isPathMatchingIgnoredPaths(path, ignoredPaths) {
    const fullPath = '/' + path.join('/');
    const pathLastPart = path[path.length - 1];
    return ignoredPaths.includes(pathLastPart) || ignoredPaths.includes(fullPath);
}
function processElementNode(node, state, preserveSpace) {
    state.path.push(node.name);
    if (!preserveSpace && state.content.length > 0) {
        newLine(state);
    }
    appendContent(state, '<' + node.name);
    processAttributes(state, node.attributes);
    if (node.children === null || (state.options.forceSelfClosingEmptyTag && node.children.length === 0)) {
        const selfClosingNodeClosingTag = state.options.whiteSpaceAtEndOfSelfclosingTag ? ' />' : '/>';
        // self-closing node
        appendContent(state, selfClosingNodeClosingTag);
    }
    else if (node.children.length === 0) {
        // empty node
        appendContent(state, '></' + node.name + '>');
    }
    else {
        const nodeChildren = node.children;
        appendContent(state, '>');
        state.level++;
        let nodePreserveSpace = node.attributes['xml:space'] === 'preserve' || preserveSpace;
        let ignoredPath = false;
        if (!nodePreserveSpace && state.options.ignoredPaths) {
            ignoredPath = isPathMatchingIgnoredPaths(state.path, state.options.ignoredPaths);
            nodePreserveSpace = ignoredPath;
        }
        if (!nodePreserveSpace && state.options.collapseContent) {
            let containsTextNodes = false;
            let containsTextNodesWithLineBreaks = false;
            let containsNonTextNodes = false;
            nodeChildren.forEach(function (child, index) {
                if (child.type === 'Text') {
                    if (child.content.includes('\n')) {
                        containsTextNodesWithLineBreaks = true;
                        child.content = child.content.trim();
                    }
                    else if ((index === 0 || index === nodeChildren.length - 1) && !preserveSpace) {
                        if (child.content.trim().length === 0) {
                            // If the text node is at the start or end and is empty, it should be ignored when formatting
                            child.content = '';
                        }
                    }
                    // If there is some content or whitespaces have been removed and there is no other siblings
                    if (child.content.trim().length > 0 || nodeChildren.length === 1) {
                        containsTextNodes = true;
                    }
                }
                else if (child.type === 'CDATA') {
                    containsTextNodes = true;
                }
                else {
                    containsNonTextNodes = true;
                }
            });
            if (containsTextNodes && (!containsNonTextNodes || !containsTextNodesWithLineBreaks)) {
                nodePreserveSpace = true;
            }
        }
        nodeChildren.forEach(function (child) {
            processNode(child, state, preserveSpace || nodePreserveSpace);
        });
        state.level--;
        if (!preserveSpace && !nodePreserveSpace) {
            newLine(state);
        }
        if (ignoredPath) {
            indent(state);
        }
        appendContent(state, '</' + node.name + '>');
    }
    state.path.pop();
}
function processAttributes(state, attributes) {
    Object.keys(attributes).forEach(function (attr) {
        if (state.options.attributeQuotes === 'single') {
            const escaped = attributes[attr].replace(/'/g, '&apos;');
            appendContent(state, ' ' + attr + '=\'' + escaped + '\'');
        }
        else {
            const escaped = attributes[attr].replace(/"/g, '&quot;');
            appendContent(state, ' ' + attr + '="' + escaped + '"');
        }
    });
}
function processProcessingIntruction(node, state) {
    if (state.content.length > 0) {
        newLine(state);
    }
    appendContent(state, '<?' + node.name);
    appendContent(state, ' ' + node.content.trim());
    appendContent(state, '?>');
}
/**
 * Converts the given XML into human readable format.
 */
function formatXml(xml, options = {}) {
    options.indentation = 'indentation' in options ? options.indentation : '    ';
    options.collapseContent = options.collapseContent === true;
    options.lineSeparator = 'lineSeparator' in options ? options.lineSeparator : '\r\n';
    options.whiteSpaceAtEndOfSelfclosingTag = options.whiteSpaceAtEndOfSelfclosingTag === true;
    options.throwOnFailure = options.throwOnFailure !== false;
    options.attributeQuotes = 'attributeQuotes' in options ? options.attributeQuotes : 'double';
    try {
        const parsedXml = (0, xml_parser_xo_1.default)(xml, { filter: options.filter, strictMode: options.strictMode });
        const state = { content: '', level: 0, options: options, path: [] };
        if (parsedXml.declaration) {
            processProcessingIntruction(parsedXml.declaration, state);
        }
        parsedXml.children.forEach(function (child) {
            processNode(child, state, false);
        });
        if (!options.lineSeparator) {
            return state.content;
        }
        return state.content
            .replace(/\r\n/g, '\n')
            .replace(/\n/g, options.lineSeparator);
    }
    catch (err) {
        if (options.throwOnFailure) {
            throw err;
        }
        return xml;
    }
}
formatXml.minify = (xml, options = {}) => {
    return formatXml(xml, Object.assign(Object.assign({}, options), { indentation: '', lineSeparator: '' }));
};
if (true) {
    module.exports = formatXml;
}
exports["default"] = formatXml;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 8603:
/***/ ((module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParsingError = void 0;
class ParsingError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
}
exports.ParsingError = ParsingError;
let parsingState;
function nextChild() {
    return element(false) || text() || comment() || cdata() || processingInstruction();
}
function nextRootChild() {
    match(/\s*/);
    return element(true) || comment() || doctype() || processingInstruction();
}
function parseDocument() {
    const declaration = processingInstruction();
    const children = [];
    let documentRootNode;
    let child = nextRootChild();
    while (child) {
        if (child.node.type === 'Element') {
            if (documentRootNode) {
                throw new Error('Found multiple root nodes');
            }
            documentRootNode = child.node;
        }
        if (!child.excluded) {
            children.push(child.node);
        }
        child = nextRootChild();
    }
    if (!documentRootNode) {
        throw new ParsingError('Failed to parse XML', 'Root Element not found');
    }
    if (parsingState.xml.length !== 0) {
        throw new ParsingError('Failed to parse XML', 'Not Well-Formed XML');
    }
    return {
        declaration: declaration ? declaration.node : null,
        root: documentRootNode,
        children
    };
}
function processingInstruction() {
    const m = match(/^<\?([\w-:.]+)\s*/);
    if (!m)
        return;
    // tag
    const node = {
        name: m[1],
        type: 'ProcessingInstruction',
        content: ''
    };
    const endMarkerIndex = parsingState.xml.indexOf('?>');
    if (endMarkerIndex > -1) {
        node.content = parsingState.xml.substring(0, endMarkerIndex).trim();
        parsingState.xml = parsingState.xml.slice(endMarkerIndex);
    }
    else {
        throw new ParsingError('Failed to parse XML', 'ProcessingInstruction closing tag not found');
    }
    match(/\?>/);
    return {
        excluded: parsingState.options.filter(node) === false,
        node
    };
}
function element(matchRoot) {
    const m = match(/^<([^?!</>\s]+)\s*/);
    if (!m)
        return;
    // name
    const node = {
        type: 'Element',
        name: m[1],
        attributes: {},
        children: []
    };
    const excluded = matchRoot ? false : parsingState.options.filter(node) === false;
    // attributes
    while (!(eos() || is('>') || is('?>') || is('/>'))) {
        const attr = attribute();
        if (attr) {
            node.attributes[attr.name] = attr.value;
        }
        else {
            return;
        }
    }
    // self closing tag
    if (match(/^\s*\/>/)) {
        node.children = null;
        return {
            excluded,
            node
        };
    }
    match(/\??>/);
    // children
    let child = nextChild();
    while (child) {
        if (!child.excluded) {
            node.children.push(child.node);
        }
        child = nextChild();
    }
    // closing
    if (parsingState.options.strictMode) {
        const closingTag = `</${node.name}>`;
        if (parsingState.xml.startsWith(closingTag)) {
            parsingState.xml = parsingState.xml.slice(closingTag.length);
        }
        else {
            throw new ParsingError('Failed to parse XML', `Closing tag not matching "${closingTag}"`);
        }
    }
    else {
        match(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
    }
    return {
        excluded,
        node
    };
}
function doctype() {
    const m = match(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
        match(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
        match(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
        match(/^<!DOCTYPE\s+\S+\s*>/);
    if (m) {
        const node = {
            type: 'DocumentType',
            content: m[0]
        };
        return {
            excluded: parsingState.options.filter(node) === false,
            node
        };
    }
}
function cdata() {
    if (parsingState.xml.startsWith('<![CDATA[')) {
        const endPositionStart = parsingState.xml.indexOf(']]>');
        if (endPositionStart > -1) {
            const endPositionFinish = endPositionStart + 3;
            const node = {
                type: 'CDATA',
                content: parsingState.xml.substring(0, endPositionFinish)
            };
            parsingState.xml = parsingState.xml.slice(endPositionFinish);
            return {
                excluded: parsingState.options.filter(node) === false,
                node
            };
        }
    }
}
function comment() {
    const m = match(/^<!--[\s\S]*?-->/);
    if (m) {
        const node = {
            type: 'Comment',
            content: m[0]
        };
        return {
            excluded: parsingState.options.filter(node) === false,
            node
        };
    }
}
function text() {
    const m = match(/^([^<]+)/);
    if (m) {
        const node = {
            type: 'Text',
            content: m[1]
        };
        return {
            excluded: parsingState.options.filter(node) === false,
            node
        };
    }
}
function attribute() {
    const m = match(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
    if (m) {
        return {
            name: m[1].trim(),
            value: stripQuotes(m[2].trim())
        };
    }
}
function stripQuotes(val) {
    return val.replace(/^['"]|['"]$/g, '');
}
/**
 * Match `re` and advance the string.
 */
function match(re) {
    const m = parsingState.xml.match(re);
    if (m) {
        parsingState.xml = parsingState.xml.slice(m[0].length);
        return m;
    }
}
/**
 * End-of-source.
 */
function eos() {
    return 0 === parsingState.xml.length;
}
/**
 * Check for `prefix`.
 */
function is(prefix) {
    return 0 === parsingState.xml.indexOf(prefix);
}
/**
 * Parse the given XML string into an object.
 */
function parseXml(xml, options = {}) {
    xml = xml.trim();
    const filter = options.filter || (() => true);
    parsingState = {
        xml,
        options: Object.assign(Object.assign({}, options), { filter, strictMode: options.strictMode === true })
    };
    return parseDocument();
}
if (true) {
    module.exports = parseXml;
}
exports["default"] = parseXml;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 7474:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CoverageParser = void 0;
const model_1 = __nccwpck_require__(5852);
const reporter_1 = __nccwpck_require__(2611);
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = __nccwpck_require__(2596);
class CoverageParser {
    inputPath;
    results;
    constructor(inputPath) {
        this.inputPath = inputPath;
    }
    async parseObject() {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parse(this.inputPath, (error, info) => {
                if (error) {
                    reject(error);
                    return;
                }
                this.results = info.map(model_1.CoverageFromJSON);
                resolve();
            });
        });
    }
    toReport(threshold = 80) {
        const results = this.results?.flatMap(r => r.lines);
        if (!results) {
            return new reporter_1.Reporter({
                summary: '',
                detail: '',
                comment: '',
                annotations: [],
                status: 'failure',
                outputs: {}
            });
        }
        const summary = ['### Coverage\n'].concat(this.results?.map(f => f.toSummary()) ?? []);
        const summaryCount = { hit: 0, found: 0 };
        for (const line of results) {
            summaryCount.hit += line.hit;
            summaryCount.found += line.found;
        }
        const state = summaryCount.found > 0
            ? Math.round((summaryCount.hit / summaryCount.found) * 1000) / 10
            : 0;
        const icon = state >= threshold ? ':white_check_mark:' : ':x:';
        const comment = [];
        comment.push(`#### ${icon} Coverage`);
        comment.push('');
        comment.push(`| Hit | Found | State |`);
        comment.push(`| ---- | ---- | ---- |`);
        comment.push(`| ${summaryCount.hit}| ${summaryCount.found} | ${state} |`);
        comment.push('');
        return new reporter_1.Reporter({
            summary: summary.join(''),
            detail: '',
            comment: comment.join('\n'),
            annotations: [],
            status: state >= threshold ? 'success' : 'failure',
            outputs: {
                coverage: state.toFixed(1),
                'coverage-hit': summaryCount.hit.toString(),
                'coverage-found': summaryCount.found.toString()
            }
        });
    }
}
exports.CoverageParser = CoverageParser;


/***/ }),

/***/ 3196:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.exportReport = void 0;
exports.escapeEmoji = escapeEmoji;
const fs_1 = __nccwpck_require__(9896);
const charactersLimit = 65535;
const stepSummaryPath = process.env['GITHUB_STEP_SUMMARY'];
const commentMarker = '<!-- flutter-test-action-comment -->';
function combineConclusion(report, coverage) {
    const conclusions = [report?.status, coverage?.status].filter((status) => status !== undefined);
    if (conclusions.length === 0) {
        return 'failure';
    }
    return conclusions.every(status => status === 'success')
        ? 'success'
        : 'failure';
}
async function appendStepSummary(title, summary, detail) {
    if (!stepSummaryPath) {
        return;
    }
    const content = [`## ${title}`, '', summary];
    if (detail) {
        content.push('', detail);
    }
    content.push('', '');
    await fs_1.promises.appendFile(stepSummaryPath, content.join('\n'), 'utf8');
}
function buildCommentBody(comment) {
    return `${commentMarker}\n${comment}`;
}
/**
 * Escape emoji sequences.
 */
function escapeEmoji(input) {
    const regex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
    return input.replace(regex, ``); // replace emoji with empty string (\\u${(match.codePointAt(0) || "").toString(16)})
}
const exportReport = async ({ report, coverage }) => {
    const [core, github] = await Promise.all([
        Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(623)]).then(__nccwpck_require__.bind(__nccwpck_require__, 7623)),
        Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(573)]).then(__nccwpck_require__.bind(__nccwpck_require__, 2573))
    ]);
    const token = core.getInput('token');
    const conclusion = combineConclusion(report, coverage);
    let title = core.getInput('title');
    if (title.length > charactersLimit) {
        core.error(`The 'title' will be truncated because the character limit (${charactersLimit}) exceeded.`);
        title = title.substring(0, charactersLimit);
    }
    let summary = report?.summary ?? '';
    summary += coverage?.summary ? `\n${coverage.summary}` : '';
    if (summary.length > charactersLimit) {
        core.error(`The 'summary' will be truncated because the character limit (${charactersLimit}) exceeded.`);
        summary = summary.substring(0, charactersLimit);
    }
    let reportDetail = report?.detail ?? '';
    reportDetail += coverage?.detail ? `\n${coverage.detail}` : '';
    if (reportDetail.length > charactersLimit) {
        core.error(`The 'text' will be truncated because the character limit (${charactersLimit}) exceeded.`);
        reportDetail = reportDetail.substring(0, charactersLimit);
    }
    const annotations = report?.annotations ?? [];
    if (annotations.length > 50) {
        core.error('Annotations that exceed the limit (50) will be truncated.');
    }
    let comment = report?.comment ?? '';
    comment += coverage?.comment ? `\n${coverage.comment}` : '';
    core.setOutput('conclusion', conclusion);
    for (const [name, value] of Object.entries({
        ...(report?.outputs ?? {}),
        ...(coverage?.outputs ?? {})
    })) {
        core.setOutput(name, value);
    }
    try {
        await appendStepSummary(title, summary, reportDetail);
    }
    catch (error) {
        core.error(`Failed to write step summary: ${error.message}`);
    }
    if (!token) {
        core.info('Skipping GitHub check run and pull request comment because no token was provided.');
        return;
    }
    try {
        const octokit = github.getOctokit(token);
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;
        const pr = github.context.payload.pull_request;
        const sha = (pr && pr.head.sha) || github.context.sha;
        const issueNumber = pr?.number || github.context.issue.number;
        if (comment && issueNumber) {
            const body = buildCommentBody(comment);
            const comments = await octokit.paginate(octokit.rest.issues.listComments, {
                owner,
                repo,
                issue_number: issueNumber
            });
            const existingComment = comments.find(current => typeof current.body === 'string' &&
                current.body.includes(commentMarker));
            if (existingComment) {
                await octokit.rest.issues.updateComment({
                    owner,
                    repo,
                    comment_id: existingComment.id,
                    body
                });
            }
            else {
                await octokit.rest.issues.createComment({
                    owner,
                    repo,
                    issue_number: issueNumber,
                    body
                });
            }
        }
        else if (comment) {
            core.info('Skipping pull request comment because the workflow is not running for a pull request.');
        }
        await octokit.rest.checks.create({
            owner,
            repo,
            name: title,
            head_sha: sha,
            status: 'completed',
            conclusion,
            output: {
                title,
                summary,
                text: reportDetail,
                annotations: annotations.slice(0, 50)
            }
        });
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`${error.name}:${error.message}\n\n${error.stack}`);
        }
    }
};
exports.exportReport = exportReport;


/***/ }),

/***/ 5263:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Annotation = void 0;
/*
 * @see https://docs.github.com/en/rest/reference/checks#annotations-object
 */
class Annotation {
    // Required. The path of the file to add an annotation to. For example, assets/css/main.css.
    path;
    // Required. The start line of the annotation.
    start_line;
    // Required. The end line of the annotation.
    end_line;
    // The start column of the annotation. Annotations only support start_column and end_column on the same line. Omit this parameter if start_line and end_line have different values.
    start_column;
    // The end column of the annotation. Annotations only support start_column and end_column on the same line. Omit this parameter if start_line and end_line have different values.
    end_column;
    // Required. The level of the annotation. Can be one of notice, warning, or failure.
    annotation_level;
    // Required. A short description of the feedback for these lines of code. The maximum size is 64 KB.
    message;
    // The title that represents the annotation. The maximum size is 255 characters.
    title;
    // Details about this annotation. The maximum size is 64 KB.
    raw_details;
    constructor({ path, start_line, end_line, start_column, end_column, annotation_level, message, title, raw_details }) {
        this.path = path;
        this.start_line = start_line;
        this.end_line = end_line;
        this.start_column = start_column;
        this.end_column = end_column;
        this.annotation_level = annotation_level;
        this.message = message;
        this.title = title;
        this.raw_details = raw_details;
    }
}
exports.Annotation = Annotation;


/***/ }),

/***/ 7148:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CoverageFromJSON = exports.Coverage = void 0;
const __1 = __nccwpck_require__(5852);
class Coverage {
    title;
    file;
    branches;
    functions;
    lines;
    constructor({ title, file, branches, functions, lines }) {
        this.title = title;
        this.file = file;
        this.branches = branches;
        this.functions = functions;
        this.lines = lines;
    }
    toSummary() {
        const state = this.lines.found > 0
            ? Math.round((this.lines.hit / this.lines.found) * 1000) / 10
            : 0;
        const icon = state > 80 ? ':white_check_mark:' : ':x:';
        const line = [];
        line.push(`#### ${icon} ${this.file}`);
        line.push('');
        line.push(`| Hit | Found | State |`);
        line.push(`| ---- | ---- | ---- |`);
        line.push(`| ${this.lines.hit}| ${this.lines.found} | ${state} |`);
        line.push('');
        return line.join(`\n`);
    }
}
exports.Coverage = Coverage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CoverageFromJSON = (json) => {
    if (json === undefined || json === null) {
        return json;
    }
    return new Coverage({
        title: json['title'],
        file: json['file'],
        branches: (0, __1.FunctionsFromJSON)(json['branches']),
        functions: (0, __1.FunctionsFromJSON)(json['functions']),
        lines: (0, __1.FunctionsFromJSON)(json['lines'])
    });
};
exports.CoverageFromJSON = CoverageFromJSON;


/***/ }),

/***/ 6026:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DetailsFromJSON = exports.Details = void 0;
const runtime_1 = __nccwpck_require__(6184);
class Details {
    line;
    hit;
    block;
    branch;
    taken;
    constructor({ line, hit, block, branch, taken }) {
        this.line = line;
        this.hit = hit;
        this.block = block;
        this.branch = branch;
        this.taken = taken;
    }
}
exports.Details = Details;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DetailsFromJSON = (json) => {
    if (json === undefined || json === null) {
        return json;
    }
    return new Details({
        line: (0, runtime_1.exists)(json, 'line') ? json['line'] : 0,
        hit: json['hit'],
        block: json['block'],
        branch: json['branch'],
        taken: json['taken']
    });
};
exports.DetailsFromJSON = DetailsFromJSON;


/***/ }),

/***/ 1793:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FunctionsFromJSON = exports.Functions = void 0;
const runtime_1 = __nccwpck_require__(6184);
class Functions {
    hit;
    found;
    details;
    constructor({ hit, found, details }) {
        this.hit = hit;
        this.found = found;
        this.details = details;
    }
}
exports.Functions = Functions;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FunctionsFromJSON = (json) => {
    if (json === undefined || json === null) {
        return json;
    }
    return new Functions({
        hit: (0, runtime_1.exists)(json, 'hit') ? json['hit'] : 0,
        found: (0, runtime_1.exists)(json, 'found') ? json['found'] : 0,
        details: json['details']
    });
};
exports.FunctionsFromJSON = FunctionsFromJSON;


/***/ }),

/***/ 5852:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__nccwpck_require__(9192), exports);
__exportStar(__nccwpck_require__(9917), exports);
__exportStar(__nccwpck_require__(7718), exports);
__exportStar(__nccwpck_require__(3078), exports);
__exportStar(__nccwpck_require__(7148), exports);
__exportStar(__nccwpck_require__(6026), exports);
__exportStar(__nccwpck_require__(1793), exports);


/***/ }),

/***/ 2611:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Reporter = void 0;
class Reporter {
    summary;
    detail;
    comment;
    annotations;
    status;
    outputs;
    constructor({ summary, detail, comment, annotations, status, outputs = {} }) {
        this.summary = summary;
        this.detail = detail;
        this.comment = comment;
        this.annotations = annotations;
        this.status = status;
        this.outputs = outputs;
    }
}
exports.Reporter = Reporter;


/***/ }),

/***/ 6184:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.exists = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const exists = (json, key) => {
    const value = json[key];
    return value !== null && value !== undefined;
};
exports.exists = exists;


/***/ }),

/***/ 9192:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TestDoneFromJSON = exports.TestDone = void 0;
const stateValues = (/* unused pure expression or super */ null && (['success', 'skipped', 'failure']));
class TestDone {
    id;
    time;
    state;
    error;
    stackTrace;
    constructor({ id, time, state, error, stackTrace }) {
        this.id = id;
        this.time = time;
        this.state = state;
        this.error = error;
        this.stackTrace = stackTrace;
    }
}
exports.TestDone = TestDone;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TestDoneFromJSON = (json) => {
    const id = json['testID'];
    const time = json['time'];
    const state = json['result'] === 'success' ? 'success' : 'failure';
    let error = json['error'];
    if (error) {
        error = error?.split('\n').join('');
    }
    const stackTrace = json['stackTrace'] ?? json['message'];
    return new TestDone({
        id,
        time,
        state,
        error,
        stackTrace
    });
};
exports.TestDoneFromJSON = TestDoneFromJSON;


/***/ }),

/***/ 9917:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TestGroupFromJSON = exports.TestGroup = void 0;
class TestGroup {
    id;
    name;
    suiteId;
    testCount;
    time;
    tests;
    constructor({ id, name, suiteId, testCount, time }) {
        this.id = id;
        this.name = name;
        this.suiteId = suiteId;
        this.testCount = testCount;
        this.time = time;
        this.tests = [];
    }
    toUnit() {
        const lines = [];
        for (const model of this.tests) {
            lines.push(model.toUnit());
        }
        return lines.join('\n');
    }
}
exports.TestGroup = TestGroup;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TestGroupFromJSON = (json) => {
    const id = json['group']['id'];
    const name = json['group']['name'];
    const suiteId = json['group']['suiteID'];
    const testCount = json['group']['testCount'];
    const time = json['time'];
    return new TestGroup({ id, name, suiteId, testCount, time });
};
exports.TestGroupFromJSON = TestGroupFromJSON;


/***/ }),

/***/ 7718:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TestStartFromJSON = exports.TestStart = void 0;
const annotation_1 = __nccwpck_require__(5263);
class TestStart {
    id;
    suiteId;
    groupIds;
    name;
    url;
    time;
    skip;
    line;
    column;
    result;
    constructor({ id, suiteId, groupIds, name, url, skip, line, column, time }) {
        this.id = id;
        this.suiteId = suiteId;
        this.groupIds = groupIds ?? [];
        this.name = name;
        this.url = url;
        this.skip = skip;
        this.line = line;
        this.column = column;
        this.time = time;
    }
    get stateIcon() {
        switch (this.result?.state) {
            case 'success':
                return ':white_check_mark:';
            case 'skipped':
                return ':wavy_dash:';
        }
        return ':x:';
    }
    toAnnotation() {
        if (!this.result)
            return undefined;
        if (this.result.state === 'success')
            return undefined;
        return new annotation_1.Annotation({
            path: this.url,
            start_line: this.line,
            end_line: this.line,
            annotation_level: 'failure',
            message: this.result.error ?? '',
            title: this.name,
            raw_details: this.result.stackTrace
        });
    }
    toUnit() {
        const lines = [
            `<testcase classname="${this.name}" time="${this.time}">`
        ];
        if (this.result) {
            if (this.result.state === 'failure') {
                lines.push(`<failure type="failure" message="${this.escapeHtml(this.result.error ?? '')}">${this.escapeHtml(this.result.stackTrace ?? '')}</failure>`);
            }
        }
        lines.push('</testcase>');
        return lines.join('\n');
    }
    toDetail() {
        if (this.result) {
            return `| ${this.name} | ${this.stateIcon} | ${this.result.time} |`;
        }
        return '';
    }
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.TestStart = TestStart;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TestStartFromJSON = (json) => {
    const id = json['test']['id'];
    const suiteId = json['test']['suiteID'];
    const groupIds = json['test']['groupIDs'];
    const name = json['test']['name'];
    const url = json['test']['url'];
    const skip = json['test']['metadata']['skip'];
    const line = json['test']['line'];
    const column = json['test']['column'];
    const time = json['time'];
    return new TestStart({
        id,
        suiteId,
        groupIds,
        name,
        url,
        skip,
        line,
        column,
        time
    });
};
exports.TestStartFromJSON = TestStartFromJSON;


/***/ }),

/***/ 3078:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TestSuiteFromJSON = exports.TestSuite = void 0;
class TestSuite {
    id;
    path;
    platform;
    time;
    groups;
    constructor({ id, path, platform, time }) {
        this.id = id;
        this.path = path;
        this.platform = platform;
        this.time = time;
        this.groups = [];
    }
    findTestStart(testId) {
        const tests = this.groups.flatMap(g => g.tests);
        return tests.find(test => test.id === testId);
    }
    findTestGroup(groupIds) {
        return this.groups.find(g => groupIds.includes(g.id));
    }
    get hasError() {
        const tests = this.groups.flatMap(g => g.tests);
        return tests.filter(test => test.result?.state === 'failure').length > 0;
    }
    toUnit() {
        const tests = this.groups.flatMap(g => g.tests);
        const error = tests.filter(test => test.result?.state === 'failure');
        const lines = [
            `<testsuite id="${this.id}" package="${this.path}" tests="${tests.length}" failures="${error.length}" time="${this.time}">`
        ];
        for (const model of this.groups) {
            lines.push(model.toUnit());
        }
        lines.push('</testsuite>');
        return lines.join('\n');
    }
    toReport() {
        const tests = this.groups.flatMap(g => g.tests);
        const success = tests.filter(test => test.result?.state === 'success');
        const error = tests.filter(test => test.result?.state === 'failure');
        return `${this.path} tests: ${tests.length}  success: ${success.length} failures: ${error.length}`;
    }
    toSummary() {
        const tests = this.groups.flatMap(g => g.tests);
        const success = tests.filter(test => test.result?.state === 'success');
        const error = tests.filter(test => test.result?.state === 'failure');
        const icon = error.length > 0 ? ':x:' : ':white_check_mark:';
        const line = [];
        line.push(`#### ${icon} ${this.path}`);
        line.push('');
        line.push(`| tests | success | failures |`);
        line.push(`| ---- | ---- | ---- |`);
        line.push(`| ${tests.length}| ${success.length} | ${error.length} |`);
        line.push('');
        return line.join(`\n`);
    }
    toDetail() {
        const tests = this.groups.flatMap(g => g.tests);
        return tests
            .map(test => test.toDetail())
            .filter(line => line !== '')
            .join('\n');
    }
}
exports.TestSuite = TestSuite;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TestSuiteFromJSON = (json) => {
    const id = json['suite']['id'];
    const platform = json['suite']['platform'];
    const path = json['suite']['path'];
    const time = json['time'];
    return new TestSuite({ id, platform, path, time });
};
exports.TestSuiteFromJSON = TestSuiteFromJSON;


/***/ }),

/***/ 4883:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Parser = void 0;
const reporter_1 = __nccwpck_require__(2611);
const model_1 = __nccwpck_require__(5852);
const xml_formatter_1 = __importDefault(__nccwpck_require__(5313));
const fs_1 = __nccwpck_require__(9896);
const { readFile } = fs_1.promises;
class Parser {
    inputPath;
    tests = [];
    constructor(inputPath) {
        this.inputPath = inputPath;
    }
    async _load() {
        const buf = await readFile(this.inputPath);
        return Buffer.from(buf).toString('utf8');
    }
    async parseObject() {
        const file = await this._load();
        const lines = file.split(/\r?\n/u).filter(line => line.length > 0);
        for (const line of lines) {
            this._parseLine(line);
        }
    }
    _parseLine(line) {
        try {
            const json = JSON.parse(line);
            if (json['type']) {
                this._parseTestSuite(json);
                this._parseTestGroup(json);
                this._parseTestStart(json);
                this._parseTestError(json);
                this._parseTestMessage(json);
                this._parseTestDone(json);
            }
        }
        catch (error) {
            throw new Error(`Failed to parse machine output: ${error.message}`);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestSuite(line) {
        if (line['type'] === 'suite') {
            this.tests.push((0, model_1.TestSuiteFromJSON)(line));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestGroup(line) {
        if (line['type'] === 'group') {
            const group = (0, model_1.TestGroupFromJSON)(line);
            const test = this.tests.find(t => t.id === group.suiteId);
            if (!test)
                return;
            test.groups.push(group);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestStart(line) {
        if (line['type'] === 'testStart') {
            const name = line['test']['name'];
            if (name.startsWith('loading /')) {
                return;
            }
            const start = (0, model_1.TestStartFromJSON)(line);
            const test = this.tests.find(t => t.id === start.suiteId);
            if (!test)
                return;
            const group = test.findTestGroup(start.groupIds);
            if (!group)
                return;
            group.tests.push(start);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestError(line) {
        if (line['type'] === 'error') {
            this._checkResult((0, model_1.TestDoneFromJSON)(line));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestMessage(line) {
        if (line['type'] === 'print') {
            this._checkResult((0, model_1.TestDoneFromJSON)(line));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _parseTestDone(line) {
        if (line['type'] === 'testDone') {
            this._checkResult((0, model_1.TestDoneFromJSON)(line));
        }
    }
    _checkResult(result) {
        const test = this.tests.find(t => t.findTestStart(result.id));
        if (!test)
            return;
        const start = test.findTestStart(result.id);
        if (!start)
            return;
        if (!start.result) {
            start.result = result;
        }
        else if (result.error) {
            start.result.error = result.error;
        }
        else if (result.stackTrace) {
            start.result.stackTrace = result.stackTrace;
        }
    }
    toUnit() {
        const lines = [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            '<testsuites>'
        ];
        for (const model of this.tests) {
            lines.push(model.toUnit());
        }
        lines.push('</testsuites>');
        return (0, xml_formatter_1.default)(lines.join('\n'));
    }
    toReport() {
        const summary = this.tests.map(test => test.toSummary());
        const detail = [
            '### Unit Test',
            '',
            '|Test|Status|Time|',
            '|----|----|----|'
        ];
        const allTests = this.tests.flatMap(test => test.groups.flatMap(g => g.tests));
        const detailColumn = allTests.map(test => test.toDetail());
        const annotations = allTests
            .map(test => test.toAnnotation())
            .filter(a => a !== undefined);
        const status = allTests.filter(t => t.result?.state === 'failure').length > 0
            ? 'failure'
            : 'success';
        const icon = status === 'success' ? ':white_check_mark:' : ':x:';
        const comment = [];
        comment.push(`#### ${icon} Unit Test`);
        comment.push('');
        comment.push(`| Test | Success | Failure |`);
        comment.push(`| ---- | ---- | ---- |`);
        comment.push(`| ${allTests.length}| ${allTests.filter(t => t.result?.state === 'success').length} | ${allTests.filter(t => t.result?.state === 'failure').length} |`);
        comment.push('');
        return new reporter_1.Reporter({
            summary: summary.join(''),
            detail: detail.concat(detailColumn).join('\n'),
            comment: comment.join('\n'),
            annotations,
            status,
            outputs: {
                tests: allTests.length.toString(),
                passed: allTests
                    .filter(t => t.result?.state === 'success')
                    .length.toString(),
                failed: allTests
                    .filter(t => t.result?.state === 'failure')
                    .length.toString()
            }
        });
    }
}
exports.Parser = Parser;


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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const coverage_1 = __nccwpck_require__(7474);
const parser_1 = __nccwpck_require__(4883);
const formatter_1 = __nccwpck_require__(3196);
function parseCoverageThreshold(value) {
    const threshold = Number(value);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw new Error('coverageThreshold must be a number between 0 and 100.');
    }
    return threshold;
}
async function run() {
    try {
        const core = await Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(623)]).then(__nccwpck_require__.bind(__nccwpck_require__, 7623));
        let parser;
        let coverage;
        const machinePath = core.getInput('machinePath');
        const coveragePath = core.getInput('coveragePath');
        if (!machinePath && !coveragePath) {
            throw new Error('Either machinePath or coveragePath must be provided.');
        }
        if (machinePath) {
            parser = new parser_1.Parser(machinePath);
            await parser.parseObject();
        }
        if (coveragePath) {
            coverage = new coverage_1.CoverageParser(coveragePath);
            await coverage.parseObject();
        }
        const coverageThreshold = parseCoverageThreshold(core.getInput('coverageThreshold') || '80');
        await (0, formatter_1.exportReport)({
            report: parser?.toReport(),
            coverage: coverage?.toReport(coverageThreshold)
        });
    }
    catch (error) {
        if (error instanceof Error) {
            const core = await Promise.all(/* import() */[__nccwpck_require__.e(662), __nccwpck_require__.e(623)]).then(__nccwpck_require__.bind(__nccwpck_require__, 7623));
            core.setFailed(`${error.name}:${error.message}\n\n${error.stack}`);
        }
    }
}
run();

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map