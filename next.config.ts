import { NextConfig } from "next";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const config: NextConfig = {
  images: {
    domains: ["api.dicebear.com"],
  },
  webpack: (config, { isServer }) => {
    // Always add the plugin, but configure it differently for server/client
    config.plugins.push(
      new MiniCssExtractPlugin({
        filename: "static/css/[name].[contenthash].css",
        chunkFilename: "static/css/[id].[contenthash].css",
      })
    );

    config.resolve.fallback = { fs: false };

    const rules = config.module.rules;
    const cssRule = rules.find((rule: { test: { toString: () => string | string[]; }; }) => rule.test?.toString().includes('css'));
    
    if (cssRule) {
      cssRule.use = [
        isServer ? 'null-loader' : MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            modules: {
              auto: true,
              localIdentName: '[local]_[hash:base64:5]'
            }
          }
        },
        'postcss-loader'
      ];
    }

    return config;
  },
};

export default config;
