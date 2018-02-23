const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    library: "Rusha",
    filename: "./dist/rusha.js",
    libraryTarget: "umd",
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  module: {
    rules: [
      { 
        test: /\.jsx?$/,
        loader: ['babel-loader'],
        exclude: /(node_modules)/ 
      },
      { 
        test: /\.sjs?$/,
        loader: ['sweetjs-loader'],
        exclude: /(node_modules)/ 
      }
    ]
  }
};
