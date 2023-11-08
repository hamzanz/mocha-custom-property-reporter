import {MochaOptions, Runner, Test, reporters} from "mocha";
import path from "path";
import * as fs from "fs";
import {MochaPropertyReporterOptions} from "./types";

const Base = reporters.Base;
const {
    EVENT_RUN_END,
    EVENT_SUITE_BEGIN,
    EVENT_TEST_END,
} = Runner.constants;


/**
 *
 * @param runner
 * @param options
 * @constructor
 */
export function MochaPropertyReporter(runner: Runner, options: MochaOptions) {

    Base.call(<reporters.Base>this, runner, options);
    const self = this;
    const testSuites: Map<string, Test[]> = new Map();

    const customReportOptions = getCustomReportOptions(options);
    const output: string = path.resolve(customReportOptions?.output ?? 'mocha-property-report.json');
    const defaultProperties = customReportOptions?.properties ?? {};

    runner.on(EVENT_TEST_END, function (test) {
        let suiteName = 'root';
        if(test.parent?.title && test.parent?.title.length > 0) {
            suiteName = test.parent?.title ?? 'root';
        }
        testSuites.get(suiteName)?.push(test);
    });

    runner.on(EVENT_SUITE_BEGIN, function (suite) {
        const suiteName = suite.root ? 'root' : suite.title;
        if(!testSuites.has(suiteName)) {
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
                fs.mkdirSync(path.dirname(output), {recursive: true});
                fs.writeFileSync(output, json);

            } catch (err: any) {
                console.error(
                    `${Base.symbols.err} [mocha] writing output to "${output}" failed: ${err?.message}\n`
                );
                write(json);
            }
        } else {
            write(json);
        }
    });
}

function getTestSuites(testSuitesMap: Map<string, Test[]>) {
    const suites = [];
    for (const [suiteName, tests] of testSuitesMap) {
        if(tests.length === 0) continue;

        const suite = {
            name: suiteName,
            cases: tests.map(clean)
        };
        suites.push(suite);
    }

    return suites;
}

function write(str: string) {
    process.stdout.write(str);
}

function getCustomReportOptions(options: MochaOptions): MochaPropertyReporterOptions | undefined{
    const reporterOptions = options?.reporterOptions ?? options;
    const customOptionsFilename = reporterOptions?.configFile;
    let customOptions;

    if(!customOptionsFilename) {
        return customOptions;
    }

    const customOptionsFilepath = path.resolve(customOptionsFilename);

    try {
        customOptions = JSON.parse(fs.readFileSync(customOptionsFilepath).toString())

    } catch (e) {
        console.error(e)
        throw e;
    }

    return customOptions as MochaPropertyReporterOptions;
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @private
 * @param {Object} test
 * @return {Object}
 */
function clean(test: any) {
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
function cleanCycles(obj: any) {
    const cache: any[] = [];
    return JSON.parse(
        JSON.stringify(obj, function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Instead of going in a circle, we'll print [object Object]
                    return '' + value;
                }
                cache.push(value);
            }

            return value;
        })
    );
}

/**
 * Transform an Error object into a JSON object.
 *
 * @private
 * @param {Error} err
 * @return {Object}
 */
function errorJSON(err: any) {
    const res: Record<string, any> = {};
    Object.getOwnPropertyNames(err).forEach(function (key) {
        if(key.toLowerCase() !== 'multiple') {
            res[key] = err[key];
        }
    }, err);
    return res;
}