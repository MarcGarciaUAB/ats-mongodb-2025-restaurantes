Prácticas ATS


## Tareas obligatorias
### 1. Diseño del esquema de la base de datos
- Al tener inspecciones un campo con el id del restaurante referenciado, se puede discernir el hecho de que la relación puede ser One-to-Many o One-to-Millions, pero viendo el tamaño de los documentos y la relación entre ellos ( 6370 inspecciones / 2548 restaurantes = 2,5 inspecciones por restaurante ) se puede asumir fácilmente que la relación entre ambas colecciones es One-to-Many, pero con posibilidad de ser One-to-Few actualmente.

- Viendo la escalabilidad de las colecciones (por ejemplo, se añade un restaurante muy famoso y longevo, el cual tiene demasiadas inspecciones) es muy probable que los documentos terminen ocupando más del tamaño máximo permitido de 16MB, por lo tanto la referenciación tiene mucho más sentido al ser One-to-Many. Si en cambio fueran One-to-Few sí tendría más sentido utilizar el formato de elementos embebidos. En nuestro caso podría incorporarse la colección con elementos embebidos debido a que no hay excesivas inspecciones por cada restaurante, pero hemos decidido no implementarlo para poder practicar con las referencias.

- Esquema de validación para restaurantes:
```plaintext
{
"$jsonSchema": {
"bsonType": "object",
"required": ["address", "name", "outcode", "postcode", "rating", "type_of_food"],
"properties": { "address": { "bsonType": "string", "description": "Direccion del restaurante" },
  	"name": { "bsonType": "string", "description": "Nombre del restaurante" },
    "outcode": { "bsonType": "string", "description": "Codigo de zona" },
    "postcode": { "bsonType": "string", "description": "Codigo postal" },
    "rating": { "bsonType": "double", "minimum": 0, "maximum": 6, "description": "Calificacion del restaurante" },
    "type_of_food": { "bsonType": "string", "description": "Tipo de comida ofrecida" }
}}}
```
- Esquema de validación para inspecciones:
```plaintext
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["id", "certificate_number", "business_name", "date", "result", "address", "restaurant_id"],
    "properties": {
      "id": { "bsonType": "string", "description": "ID de la inspeccion" },
      "certificate_number": { "bsonType": "int", "description": "Número de certificado de la inspeccion" },
      "business_name": { "bsonType": "string", "description": "Nombre del negocio inspeccionado" },
      "date": { "bsonType": "date", "description": "Fecha de la inspeccion" },
      "result": { "bsonType": "string", "description": "Resultado de la inspeccion" },
      "address": { "bsonType": "object", "required": ["city", "zip", "street", "number"],
        "properties": {
          "city": { "bsonType": "string", "description": "Ciudad del negocio" },
          "zip": { "bsonType": "string", "description": "Codigo postal" },
          "street": { "bsonType": "string", "description": "Nombre de la calle" },
          "number": { "bsonType": "string", "description": "Número de direccion" }
        }},
      "restaurant_id": {
        "bsonType": "string",
        "description": "ID del restaurante asociado"
      }}}}
```
**NOTAS**: inspecciones la hemos dejado como formato date como se suponía que debía estar en vez de string.
 ## 2. Implementación de consultas en MongoDB
- Restaurantes de comida china:
```plaintext
db.restaurants.find({type_of_food: "Chinese"})
```
![image](https://github.com/user-attachments/assets/32c439af-ae82-419e-854a-f4d4f210142c)

- Inspecciones con el resultado con alguna violacion cometida:
```plaintext
db.inspections.find({result: "Violation Issued"}).sort({date: 1}) 
```
**NOTAS**: el campo de date estaba inicialmente como numérico y era posible ordenarlo, ahora ya no.
![image](https://github.com/user-attachments/assets/6db596d0-5a58-48f3-8a17-aa121019b5de)


- Restaurantes con rating más alto que 4
```plaintext
db.restaurants.find({rating: {$gt: 4}})
```
![image](https://github.com/user-attachments/assets/6611ab4d-d387-4d0b-aec0-8da21ae25f23)

## 3. Uso de agregaciones

- Restaurantes agrupados por tipo de comida ordenados en función de su rating:
```plaintext
db.restaurants.aggregate([
  { $group: {
     _id:"$type_of_food", average_rating:{ $avg: "$rating" }}}]) 
```
**NOTAS**: hay un valor *NEW* que tiene rating null
![image](https://github.com/user-attachments/assets/052a8e98-8efd-4f07-9445-71a4bcb4c799)


- Porcentaje de inspecciones según el resultado:
```plaintext
db.inspections.aggregate([
{ $group: {
    _id: "$result",
    count: { $sum: 1 }
}
},
{ $group: {
    _id: null,
    total: { $sum: "$count" },
    results: { 
      $push: { 
        result: "$_id", 
        count: "$count" 
}}}},
{
  $unwind: "$results"
},
{ $project: {
    _id: "$results.result",
    count: "$results.count",
    percentage: {
      $multiply: [{ $divide: ["$results.count", "$total"] }, 100] }
}}])
```
![image](https://github.com/user-attachments/assets/a90fdbd3-8e12-40f1-ad22-37506e530724)



- Restaurantes con sus inspecciones agregadas como arrays
```plaintext
db.restaurants.aggregate([
  {
    $lookup: {
      from: "inspections",
      let: { restaurantId: "$_id" }, 
      pipeline: [
        {
          $match: {
            $expr: { $eq: [{ $toObjectId: "$restaurant_id" }, "$$restaurantId"] }
          }
        }
      ],
      as: "inspections"
    }
  }
])
```
como comentario, hemos tenido que utilizar una variable (utilizando “let”) para poder igualar ambos ids al mismo tipo, ya que uno era ObjectId y otro era string.
![image](https://github.com/user-attachments/assets/f44ccc78-75be-45f6-8d35-c097a9bd3e7a)



# Tareas avanzadas
## 1. Optimización del rendimiento 
- Las consultas más utilizadas estimamos que serán tanto por tipo de comida como por rating, como ambas a la vez, por lo tanto crearemos los siguientes índices:
```plaintext
db.restaurants.createIndex({ type_of_food: 1 })
db.restaurants.createIndex({ rating: -1 })
db.restaurants.createIndex({ type_of_food: 1, rating: -1 })
db.restaurants.createIndex({ postcode: 1 })
```
Estos índices nos permitirán buscar tanto por tipo de comida individualmente, como por rating descendente de manera individual, como por ambas a la vez (buscar los mejores restaurantes de comida Thai). Por último crearemos un índice en el código postal, para filtrar por localización.

- Los execution stats son los siguientes:
```plaintext
type_of_food sin índice: operationTime: Timestamp({ t: 1742378788, i: 1 })
type_of_food con índice:   operationTime: Timestamp({ t: 1742379528, i: 1 })
rating sin índice: operationTime: Timestamp({ t: 1742378889, i: 20 })
rating con índice: operationTime: Timestamp({ t: 1742379608, i: 1 }) 
conjunto sin índice: operationTime: Timestamp({ t: 1742379059, i: 2 })
conjunto con índice: operationTime: Timestamp({ t: 1742379628, i: 1 })
	postcode sin índice: operationTime: Timestamp({ t: 1742379397, i: 2 })
	postcode con índice: operationTime: Timestamp({ t: 1742379888, i: 1 }) 
```
Conclusiones: al ser búsquedas muy pequeñas, el tiempo es irrelevante ya que no debería notar diferencia. Lo importante son las iteraciones, las cuales disminuyen en todos los índices aplicados.

## 3. Estrategias de escalabilidad

- Debido a lo argumentado en el punto previo, la parte más importante de un sharding (la elección de la shard key) se puede decidir en base a esas búsquedas más recurrentes. la shard key puede ser tanto el postcode como el type_of_food, pero es muy probable que las búsquedas sean desbalanceadas (por ejemplo, la comida española no es muy famosa en gran bretaña pero la italiana sí) así que lo más seguro será seleccionar el _id y aplicarle hashing, así las búsquedas nunca serán desbalanceadas. 

- Para la replicación, creemos que lo más viable será tener un replica set con un nodo primario y, como mínimo, dos secundarios con posibilidad de convertirse en primarios en caso de caída, asegurando así la disponibilidad en todo momento de la base de datos.

- Los posibles cuellos de botella y sus soluciones pueden ser los siguientes:
  - Consultas lentas por culpa de la cantidad de documentos en la base de datos → Creación de índices adecuados en base a las consultas más utilizadas
  - Carga de sharding desbalanceada → Shard Key seleccionada en base al id utilizando hashing.
  - Consumo de RAM elevado al hacer consultas → recomendar la utilización de proyecciones y agregaciones a la hora de consultar.
