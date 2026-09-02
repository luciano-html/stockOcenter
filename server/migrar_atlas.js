const mongoose = require('mongoose');

async function migrate(atlasUri) {
  const localUri = 'mongodb://127.0.0.1:27017/stock-office-center';
  
  console.log('🔌 Conectando a Base de Datos Local...');
  const localConnection = await mongoose.createConnection(localUri).asPromise();
  
  console.log('☁️ Conectando a MongoDB Atlas (Nube)...');
  const atlasConnection = await mongoose.createConnection(atlasUri).asPromise();
  
  console.log('✅ Conexiones exitosas. Buscando colecciones...');
  const collections = await localConnection.db.listCollections().toArray();
  
  for (let col of collections) {
    const colName = col.name;
    
    // Ignorar colecciones del sistema
    if (colName.startsWith('system.')) continue;
    
    console.log(`\n📦 Migrando colección: [${colName}]...`);
    
    const docs = await localConnection.db.collection(colName).find({}).toArray();
    if (docs.length > 0) {
      try {
        console.log(`   Borrando datos viejos en Atlas para [${colName}]...`);
        await atlasConnection.db.collection(colName).deleteMany({});
        
        console.log(`   Insertando ${docs.length} documentos...`);
        await atlasConnection.db.collection(colName).insertMany(docs);
        console.log(`   ✔️ ¡Éxito!`);
      } catch (err) {
        console.error(`   ❌ Error en colección ${colName}:`, err.message);
      }
    } else {
      console.log(`   ℹ️ Colección vacía, saltando.`);
    }
  }
  
  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!');
  console.log('Ya puedes usar tu URL de Atlas en Render/Vercel.');
  process.exit(0);
}

const target = process.argv[2];
if (!target) {
  console.log('❌ Error: Falta la URL de conexión de Atlas.');
  console.log('\nPor favor, ejecuta el comando pasando tu URL entre comillas. Ejemplo:');
  console.log('node server/migrar_atlas.js "mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/stock-office-center?retryWrites=true&w=majority"');
  process.exit(1);
}

migrate(target).catch((err) => {
  console.error('\n❌ Ocurrió un error general:', err.message);
  process.exit(1);
});
