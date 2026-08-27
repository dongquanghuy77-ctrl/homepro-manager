require('dotenv').config({path:'.env.local'});
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
async function fix(){
  const c=await pool.connect();
  try{
    const r1=await c.query("UPDATE pwr_checklists SET is_done=true WHERE status='DONE' AND is_done=false");
    console.log('Fixed DONE->is_done=true:'+r1.rowCount);
    const r2=await c.query("UPDATE pwr_checklists SET is_done=false WHERE status='UNDONE' AND is_done=true");
    console.log('Fixed UNDONE->is_done=false:'+r2.rowCount);
    console.log('SYNC DONE');
  }finally{c.release();await pool.end();}
}
fix().catch(e=>{console.error(e.message);process.exit(1);});
