const crypto = require('crypto');
const pool = require('../db');

/**
 * Computes a deterministic MD5 hash of an object or string to detect content changes.
 */
function computeHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data || {});
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Retrieves cached translation if the source hash matches.
 * @param {string} cacheKey - E.g. 'supplier_123_spec_456_en'
 * @param {string} sourceHash - MD5 hash of the original source text
 * @returns {Promise<object|null>}
 */
async function getCached(cacheKey, sourceHash) {
  try {
    const [rows] = await pool.query(
      'SELECT translated_content FROM translations_cache WHERE cache_key = ? AND source_hash = ?',
      [cacheKey, sourceHash]
    );
    if (rows.length > 0 && rows[0].translated_content) {
      return JSON.parse(rows[0].translated_content);
    }
  } catch (err) {
    console.warn(`[translationCache] Error reading cache for ${cacheKey}:`, err.message);
  }
  return null;
}

/**
 * Stores translated content in the cache.
 * @param {string} cacheKey
 * @param {string} targetLang
 * @param {string} sourceHash
 * @param {object} translatedContent
 */
async function setCached(cacheKey, targetLang, sourceHash, translatedContent) {
  try {
    await pool.query(
      `INSERT INTO translations_cache (cache_key, target_lang, source_hash, translated_content)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         source_hash = VALUES(source_hash),
         translated_content = VALUES(translated_content)`,
      [cacheKey, targetLang, sourceHash, JSON.stringify(translatedContent)]
    );
  } catch (err) {
    console.warn(`[translationCache] Error saving cache for ${cacheKey}:`, err.message);
  }
}

module.exports = {
  computeHash,
  getCached,
  setCached,
};
