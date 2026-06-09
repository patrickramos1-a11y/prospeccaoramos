-- Aumenta o limite de upload do bucket de documentos do estoque para 100MB.
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'estoque-documentos';
