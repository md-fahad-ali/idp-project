import { NextConfig } from 'next';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const config: NextConfig = {
  images: {
    domains: ['api.dicebear.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash].css',
          chunkFilename: 'static/css/[name].[contenthash].css',
        })
      );
    }

    return config;
  },
};

export default config;
