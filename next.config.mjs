/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'dev1.videotrade.ru',
                port: '',
                pathname: '/api/files/**',
            },
        ],
    },
};

export default nextConfig;
