const mysql = require('mysql2/promise');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

let pool;

if (dbUrl) {
    console.log('🔌 Connecting to MySQL database using DATABASE_URL...');
    pool = mysql.createPool(dbUrl);
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
