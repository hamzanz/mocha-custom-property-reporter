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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MochaPropertyReporter = void 0;
const mocha_1 = require("mocha");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const Base = mocha_1.reporters.Base;
const { EVENT_RUN_END, EVENT_SUITE_BEGIN, EVENT_TEST_END, } = mocha_1.Runner.constants;
/**
 *
 * @param runner
 * @param options
 * @constructor
 */
function MochaPropertyReporter(runner, options) {
    Base.call(this, runner, options);
    const self = this;
    const testSuites = new Map();
    const customReportOptions = getCustomReportOptions(options);
    const output = path_1.default.resolve(customReportOptions?.output ?? 'mocha-property-report.json');
    const defaultProperties = customReportOptions?.properties ?? {};
    runner.on(EVENT_TEST_END, function (test) {
        let suiteName = 'root';
        if (test.parent?.title && test.parent?.title.length > 0) {
            suiteName = test.parent?.title ?? 'root';
        }
        testSuites.get(suiteName)?.push(test);
    });
    runner.on(EVENT_SUITE_BEGIN, function (suite) {
        const suiteName = suite.root ? 'root' : suite.title;
        if (!testSuites.has(suiteName)) {
            testSuites.set(suiteName, []);
        }
    });
    runner.on(EVENT_RUN_END, function () {
        const obj = {
            stats: self.stats,
            suites: getTestSuites(testSuites),
            defaultProperties
        };
        const json = JSON.stringify(obj, null, 2);
        if (output) {
            console.log(`Test report generated at - ${output}`);
            try {
                fs.mkdirSync(path_1.default.dirname(output), { recursive: true });
                fs.writeFileSync(output, json);
            }
            catch (err) {
                console.error(`${Base.symbols.err} [mocha] writing output to "${output}" failed: ${err?.message}\n`);
                write(json);
            }
        }
        else {
            write(json);
        }
    });
}
exports.MochaPropertyReporter = MochaPropertyReporter;
function getTestSuites(testSuitesMap) {
    const suites = [];
    for (const [suiteName, tests] of testSuitesMap) {
        if (tests.length === 0)
            continue;
        const suite = {
            name: suiteName,
            cases: tests.map(clean)
        };
        suites.push(suite);
    }
    return suites;
}
function write(str) {
    process.stdout.write(str);
}
function getCustomReportOptions(options) {
    const reporterOptions = options?.reporterOptions ?? options;
    const customOptionsFilename = reporterOptions?.configFile;
    let customOptions;
    if (!customOptionsFilename) {
        return customOptions;
    }
    const customOptionsFilepath = path_1.default.resolve(customOptionsFilename);
    try {
        customOptions = JSON.parse(fs.readFileSync(customOptionsFilepath).toString());
    }
    catch (e) {
        console.error(e);
        throw e;
    }
    return customOptions;
}
/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @private
 * @param {Object} test
 * @return {Object}
 */
function clean(test) {
    let err = test.err || {};
    if (err instanceof Error) {
        err = errorJSON(err);
    }
    return {
        title: test.title,
        fullTitle: test.fullTitle(),
        file: test.file,
        duration: test.duration,
        speed: test.speed,
        properties: test?.properties ?? {},
        err: cleanCycles(err)
    };
}
/**
 * Replaces any circular references inside `obj` with '[object Object]'
 *
 * @private
 * @param {Object} obj
 * @return {Object}
 */
function cleanCycles(obj) {
    const cache = [];
    return JSON.parse(JSON.stringify(obj, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Instead of going in a circle, we'll print [object Object]
                return '' + value;
            }
            cache.push(value);
        }
        return value;
    }));
}
/**
 * Transform an Error object into a JSON object.
 *
 * @private
 * @param {Error} err
 * @return {Object}
 */
function errorJSON(err) {
    const res = {};
    Object.getOwnPropertyNames(err).forEach(function (key) {
        if (key.toLowerCase() !== 'multiple') {
            res[key] = err[key];
        }
    }, err);
    return res;
}
