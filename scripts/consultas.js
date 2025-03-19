// Restaurantes de comida china
 db.restaurants.find({type_of_food: "Chinese"})

// Inspecciones con el resultado con alguna violación cometida
 db.inspections.find({result: "Violation Issued"}).sort({date: 1})

// Restaurantes con rating más alto que 4
 db.restaurants.find({rating: {$gt: 4}})

// Restaurantes agrupados por tipo de comida ordenados en función de su rating
 db.restaurants.aggregate([
   { $group: {
      _id:"$type_of_food", average_rating:{ $avg: "$rating" }}}])

// Porcentaje de inspecciones según el resultado
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
 }}}])

// Restaurantes con sus inspecciones agregadas como arrays
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

// Creación de índices para optimización
 db.restaurants.createIndex({ type_of_food: 1 })
 db.restaurants.createIndex({ rating: -1 })
 db.restaurants.createIndex({ type_of_food: 1, rating: -1 })
 db.restaurants.createIndex({ postcode: 1 })
