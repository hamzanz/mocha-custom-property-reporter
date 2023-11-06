import {MochaOptions, Test, TestInterface} from "mocha";

export type MochaPropertyReporterOptions = {
    output: string;
    properties: Record<string, any>
}

export type TestWithProperties = {
    properties: Record<string, any>
} & Test;