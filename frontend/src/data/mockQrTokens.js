export const mockQrTokens = [
  {
    id: "qr-1",
    profile_id: "emp-1",
    token_hash: "28e08d6b8f1c84cbf9b1397bcfb92d6e355c276f7f0c1a1796be1131a986cf3f", // SHA256 dari raw token
    status: "used",
    expires_at: "2026-05-26T08:05:00.000Z",
    used_at: "2026-05-26T08:02:15.000Z",
    device_id: "dev-budi-1"
  },
  {
    id: "qr-2",
    profile_id: "emp-2",
    token_hash: "7bcfb92d6e355c276f7f0c1a1796be1131a986cf3f28e08d6b8f1c84cbf9b1397",
    status: "active",
    expires_at: "2026-05-27T16:00:00.000Z",
    used_at: null,
    device_id: null
  },
  {
    id: "qr-3",
    profile_id: "emp-3",
    token_hash: "a986cf3f28e08d6b8f1c84cbf9b13977bcfb92d6e355c276f7f0c1a1796be1131",
    status: "expired",
    expires_at: "2026-05-25T10:00:00.000Z",
    used_at: null,
    device_id: null
  },
  {
    id: "qr-4",
    profile_id: "emp-4",
    token_hash: "e08d6b8f1c84cbf9b13977bcfb92d6e355c276f7f0c1a1796be1131a986cf3f28",
    status: "revoked",
    expires_at: "2026-05-27T20:00:00.000Z",
    used_at: null,
    device_id: null
  }
];
