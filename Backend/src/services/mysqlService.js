const mysql = require('mysql2/promise');
const { URL } = require('url');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

let pool;

if (dbUrl) {
    console.log('🔌 Connecting to MySQL database using DATABASE_URL...');
    try {
        const parsedUrl = new URL(dbUrl);
        const connectionLimit = parsedUrl.searchParams.get('connection_limit');
        const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3306;

        pool = mysql.createPool({
            host: parsedUrl.hostname,
            port: port,
            user: decodeURIComponent(parsedUrl.username),
            password: decodeURIComponent(parsedUrl.password),
            database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : undefined,
            connectionLimit: connectionLimit ? parseInt(connectionLimit, 10) : 10,
            waitForConnections: true,
            queueLimit: 0
        });
    } catch (urlErr) {
        console.error('⚠️ Failed to parse DATABASE_URL cleanly, falling back to direct string connection:', urlErr.message);
        pool = mysql.createPool(dbUrl);
    }
} else {
    console.log('🔌 Connecting to MySQL database using individual config...');
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'interview_prep',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

async function query(sql, params) {
    const [results] = await pool.execute(sql, params);
    return results;
}

module.exports = {
    pool,
    query
};
