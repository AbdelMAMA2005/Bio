-- Photos de suivi des plantes : bucket privé. Le mobile stocke le chemin de l'objet
-- dans collection.historique_photos et lit via des URL signées (createSignedUrls),
-- autorisées par la policy SELECT "Lecture photos collection par proprietaire".
UPDATE storage.buckets SET public = FALSE WHERE id = 'collections';
