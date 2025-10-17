/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'mincifri.screon.ru',
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
