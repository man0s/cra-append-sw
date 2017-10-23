#!/usr/bin/env node

const fs = require("fs");
const MemoryFs = require("memory-fs");
const webpack = require("webpack");
const program = require("commander");

const EXISTING_SW_FILE_PATH = "build/service-worker.js";
const BUNDLE_FILE_NAME = "bundle.js";

/**
 * Command line options 
 */
program
  .arguments("<file>")
  .option("-s, --skip-compile", "Skip compilation")
  .action(function(file) {
    if (program.skipCompile) {
      read(file).then(result => append(result));
    } else {
      compile(file).then(({ result, stats }) => append(result));
    }
  })
  .parse(process.argv);

/**
   * Compile entry file using WebPack
   * 
   * @param {String} Path to entry file 
   * @returns {Promise}
   */
function compile(entry) {
  const compiler = webpack({
    entry: entry,
    output: {
      filename: BUNDLE_FILE_NAME,
      path: "/"
    },
    plugins: [
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          comparisons: false
        },
        output: {
          comments: false,
          ascii_only: true
        },
        sourceMap: false
      })
    ]
  });

  compiler.outputFileSystem = new MemoryFs();

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);

      if (stats.hasErrors() || stats.hasWarnings()) {
        return reject(
          new Error(
            stats.toString({
              errorDetails: true,
              warnings: true
            })
          )
        );
      }

      const result = compiler.outputFileSystem.data[
        BUNDLE_FILE_NAME
      ].toString();
      resolve({ result, stats });
    });
  });
}

/**
 * Read entry file
 * 
 * @param {String} entry Path to entry file
 * @returns {Promise}
 */
function read(entry) {
  return new Promise((resolve, reject) => {
    fs.readFile(entry, "utf8", (error, result) => {
      if (error) {
        reject(error);
      }

      resolve(result);
    });
  });
}

/**
 * Append custonm code to exisitng ServiceWorker
 * 
 * @param {String} code 
 * @returns {Promise}
 */
function append(code) {
  return new Promise((resolve, reject) => {
    // Read exisitng SW file
    fs.readFile(EXISTING_SW_FILE_PATH, "utf8", (error, data) => {
      if (error) {
        reject(error);
      }

      // append custom code
      const result = data + code;

      // Write modified SW file
      fs.writeFile(EXISTING_SW_FILE_PATH, result, "utf8", error => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  });
}
