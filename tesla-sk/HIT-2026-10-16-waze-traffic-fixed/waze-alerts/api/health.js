const { readSnapshot } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' });
  try {
    const snapshot = await readSnapshot();
    const ageMs = snapshot ? Date.now() - Number(snapshot.receivedAt || 0) : null;
    return res.status(200).json({ ok: Boolean(snapshot) && ageMs < 1800000, configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.APIFY_API_TOKEN), service: 'tesla-waze-alerts', mode: 'direct-apify', ageMs, alerts: snapshot?.alerts?.length || 0, jams: snapshot?.jams?.length || 0 });
  } catch (error) {
    return res.status(200).json({ ok: false, configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.APIFY_API_TOKEN), service: 'tesla-waze-alerts', mode: 'direct-apify', diagnostic: String(error?.message || error) });
  }
};
