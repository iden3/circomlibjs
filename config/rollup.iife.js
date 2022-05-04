import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import nodePolyfills from "rollup-plugin-node-polyfills"
import { terser } from "rollup-plugin-terser"

const empty = "export default {}";

export default {
    input: "main.js",
    output: {
        file: "build/circomlibjs.js",
        format: "iife",
        sourcemap: "inline",
        name: "circomlibjs"
    },
    plugins: [
        commonJS(),
        nodePolyfills(),
        babel({
            exclude: "node_modules/**",
            presets: ["@babel/preset-react"],
            babelHelpers: "bundled"
        }),
        terser(),
        nodeResolve({
            browser: true,
            exportConditions: ['browser', 'default', 'module', 'require']
        })
    ],
    onwarn: warning => {
        if (
            warning.code === 'THIS_IS_UNDEFINED'
            || warning.code === 'CIRCULAR_DEPENDENCY'
        ) { return; }
        console.warn(warning.message);
    }
};
