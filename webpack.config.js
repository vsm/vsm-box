/*
For a clean reinstall:
delete 'package-lock.json', empty 'package.json'`s dev/Dependencies, and run:
npm i -D \
  webpack  webpack-dev-server  webpack-cli \
  style-loader  css-loader  null-loader  clean-webpack-plugin \
  html-webpack-plugin  text-transform-loader  terser-webpack-plugin \
  babel-loader  @babel/core  @babel/preset-env \
  vue  vue-loader  vue-template-compiler  @vue/test-utils \
  document-register-element  vue-custom-element \
  mocha  mocha-webpack@^2.0.0-beta.0  sinon  webpack-node-externals \
  jsdom  jsdom-global  chai \
  eslint  eslint-loader  eslint-plugin-vue \
  stylelint  stylelint-webpack-plugin \
  stylelint-config-standard  stylelint-config-recess-order \
  opn-cli  npm-run-all \
  vsm-dictionary-local  vsm-dictionary-cacher ;\
npm i -P \
  string-style-html \
  vsm-autocomplete
*/


const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StylelintPlugin = require('stylelint-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const nodeExternals = require('webpack-node-externals');

const sourceMapInProd = false;
const src  = path.resolve(__dirname, './src');
const dist = path.resolve(__dirname, './dist');


module.exports = (env = {}) => {

  var DEV      = env.NODE_ENV == 'development';
  var TEST     = env.NODE_ENV == 'testing';
  var PROD     = env.NODE_ENV == 'production' || (!DEV && !TEST);
  var PROD_SA  = PROD && env.standalone == 'true';


  return Object.assign(

    { mode: DEV ? 'development' : TEST || PROD ? 'production' : 'none' },


    (DEV ? { devServer: {
        port: 3000,
        open: true,
        contentBase: src,
        watchContentBase: true
    }} : {}),


    TEST ? {} : {
      entry: DEV ?     src + '/index-dev.js' :
             PROD_SA ? src + '/main-standalone.js' :
             PROD ?    src + '/VsmBox.vue' : ''
    },


    {
      devtool: PROD ? (sourceMapInProd ? 'hidden-source-map' : false) :
               DEV  ? 'inline-source-map' :
               TEST ? 'inline-cheap-module-source-map' : false,

      module: {
        rules: [
          {
            test: /\.(js|vue)$/,
            exclude: /node_modules|dist/,
            enforce: 'pre',
            loader: 'eslint-loader',
            options: Object.assign(  // These override '.estlintrc' options.
              PROD ? {  // Disallow `console.log()`, in production builds only.
                rules: {
                  'no-console': 'warn'
                }
              } : {},
              !PROD ? {  // Make errors not abort the build, except in prod.
                emitWarning: true,
              } : {}
            )
          },
          {
            test: /\.vue$/,
            loader: 'vue-loader'
          },
          {
            test: /\.js$/,
            include: src,
            exclude: /node_modules/,
            use: [
              {
                loader: 'babel-loader',
                options: { presets: ['@babel/preset-env'] }
              },
              {
                loader: 'text-transform-loader',
                options: {
                  transformText: s =>
                    // Exclude this VsmDictionary dependency, for use in browser:
                    s.replace(/require\('xmlhttprequest'\)/g, '{}')
                }
              }
            ]
          },
          Object.assign( { test: /\.css$/ },
            TEST ? { loader: 'null-loader'} :
                   { use: ['style-loader', 'css-loader'] }
          )
        ]
      },

      resolve: {
        extensions: ['.js', '.vue'],
        alias: DEV ? {  // Do not use the default 'vue.runtime.js' during dev:
          'vue$': 'vue/dist/vue.js'  // -> this enables informative warning msgs.
        } : {}
      },

      node: {
        fs: 'empty',
        child_process: 'empty' // Extra safety against 'xmlhttprequest'-pkg error.
      },

      externals: (
        PROD && ! PROD_SA ? {
          vue: 'vue'  // Exclude Vue framework code, for a non-standalone build.
        } :
        TEST ? [ nodeExternals() ] :
      {} ),

      plugins:
        [ new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV)
          }),
          new VueLoaderPlugin()
        ]
        .concat( DEV ?
          [ new HtmlWebpackPlugin({
              template: src + '/index-dev.html',
              inject: 'body'
            }),
            new StylelintPlugin({ files: ['src/**/*.vue'] })
          ] : []
        )
        .concat( PROD && ! PROD_SA ?  // Empty 'dist' before 1st of 2 prod-builds.
          [ new CleanWebpackPlugin([ dist ]) ] : []
        ),

      optimization: {
        minimizer: PROD ? [
          new TerserPlugin({
            sourceMap: sourceMapInProd,
            parallel: true,
            terserOptions: {
              ie8: false
            }
          })] : []
      },

      output: Object.assign(
        !TEST ? {
          path: dist,
          filename: 'vsm-box' +
            (PROD_SA ? '.standalone' : '') + (PROD ? '.min' : '') + '.js',
        } : {},
        PROD && ! PROD_SA ? {
          library: 'VsmBox',
          libraryTarget: 'umd'
        } : {},
        TEST ? {  // As recommended on https://vue-test-utils.vuejs.org
          devtoolModuleFilenameTemplate: '[absolute-resource-path]',
          devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
        } : {}
      )
    }
  );
}
