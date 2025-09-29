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
    compiler: {
        // вырезать все console.* в production-сборке
        removeConsole: process.env.NODE_ENV === 'production',
    },
};

export default nextConfig;
