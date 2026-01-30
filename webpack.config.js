import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    main: './src/app.js',
    login: './src/main.js',
    category: './src/category.js',
    detalle: './src/detalle_imagen.js',
    slider: './src/slider.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      chunks: ['main'],
    }),
    new HtmlWebpackPlugin({
      template: './login_register.html',
      filename: 'login_register.html',
      chunks: ['login'],
    }),
    new HtmlWebpackPlugin({
      template: './category.html',
      filename: 'category.html',
      chunks: ['category'],
    }),
    new HtmlWebpackPlugin({
      template: './detalle_imagen.html',
      filename: 'detalle_imagen.html',
      chunks: ['detalle'],
    }),
    new HtmlWebpackPlugin({
      template: './admin_panel.html',
      filename: 'admin_panel.html',
    }),
    new HtmlWebpackPlugin({
      template: './perfil.html',
      filename: 'perfil.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/*.css', to: 'css/[name][ext]' },
      ],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
