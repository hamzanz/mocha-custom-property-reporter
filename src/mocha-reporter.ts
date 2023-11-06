import {MochaOptions, Runner, Test, reporters} from "mocha";
import path from "path";
import * as fs from "fs";
import {MochaPropertyReporterOptions, TestWithProperties} from "./types";

const Base = reporters.Base;
const {
    EVENT_RUN_BEGIN,
    EVENT_RUN_END,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END,
    EVENT_TEST_END,
    EVENT_TEST_PENDING
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
    const tests: Test[] = [];
    const pending: Test[] = [];
    const failures: Test[] = [];
    const passes: Test[] = [];
    let counter = 1;

    const customReportOptions = getCustomReportOptions(options);
    const output: string = path.resolve(customReportOptions?.output ?? 'mocha-property-report.json');
    const defaultProperties = customReportOptions?.properties ?? {};

    runner.on(EVENT_TEST_END, function (test) {
        tests.push(test);
    });

    runner.on(EVENT_TEST_PASS, function (test) {
        passes.push(test);
    });

    runner.on(EVENT_TEST_FAIL, function (test: any) {
        console.log('Test Fail');
        console.log(counter++);
        failures.push(test);
    });

    runner.on(EVENT_TEST_PENDING, function (test) {
        pending.push(test);
    });

    runner.on(EVENT_RUN_END, function () {
        console.log('Test Run End');

        const obj = {
            stats: self.stats,
            tests: tests.map(clean),
            pending: pending.map(clean),
            failures: failures.map(clean),
            passes: passes.map(clean),
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
    console.log(customOptionsFilepath);

    try {
        customOptions = JSON.parse(fs.readFileSync(customOptionsFilepath).toString())

    } catch (e) {
        console.error(e)
        throw e;
    }

    console.log(customOptions);
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
    console.log('Error clean cycle');
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
    console.log('Error json');
    const res: Record<string, any> = {};
    Object.getOwnPropertyNames(err).forEach(function (key) {
        if(key.toLowerCase() !== 'multiple') {
            res[key] = err[key];
        }
    }, err);
    return res;
}