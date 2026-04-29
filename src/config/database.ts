import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

export const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Conectado ao MSSQL');
        return pool;
    })
    .catch(err => {
        console.error('❌ Falha na conexão com o MSSQL:', err);
        throw err;
    });

// Exportamos o 'sql' para usar tipos como sql.Int, sql.VarChar nos repositórios
export { sql };