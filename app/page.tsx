import {
  getCurrentOrgName,
  getSecrets,
  getAuditLogs,
  getSecureFiles,
  createSecret,
} from "@/lib/actions";
import SecretList from "@/components/secret-list";
import { FileUploader } from "@/components/file-uploader";
import { FileList } from "@/components/file-list";

// → MAIN PAGE: Dashboard with secrets, files, and audit logs
export default async function Home() {
  const [orgName, secrets, logs, files] = await Promise.all([
    getCurrentOrgName(),
    getSecrets(),
    getAuditLogs(),
    getSecureFiles(),
  ]);

  return (
    <div
      style={{ display: "flex", justifyContent: "center", minHeight: "100vh" }}
    >
      <div
        style={{
          padding: "20px",
          fontFamily: "monospace",
          width: "500px",
          margin: "0 auto",
        }}
      >
        <h1>ShadowKeep</h1>

        <div
          style={{
            padding: "10px",
            background: "#eee",
            marginBottom: "20px",
            textAlign: "center",
            color: "black",
          }}
        >
          <strong>Current Org:</strong> {orgName}
        </div>

        <hr style={{ margin: "20px 0" }} />

        <h1>Store Secure Secret</h1>

        <form action={createSecret}>
          <label>
            Secret Name:
            <br />
            <input
              type="text"
              name="keyName"
              required
              placeholder="Key Name"
              style={{
                border: "2px solid black",
                padding: "4px",
                marginTop: "4px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </label>

          <br />

          <label>
            Secret Value (Will be encrypted):
            <br />
            <input
              type="password"
              name="keyValue"
              required
              placeholder="Key Value"
              style={{
                border: "2px solid black",
                padding: "4px",
                marginTop: "4px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </label>

          <br />

          <label>
            Self-Destruct Timer:
            <br />
            <select
              name="ttlSeconds"
              style={{
                border: "2px solid black",
                padding: "4px",
                marginTop: "4px",
                marginBottom: "10px",
                width: "100%",
              }}
            >
              <option value="0">Never</option>
              <option value="60">1 Minute (Test)</option>
              <option value="3600">1 Hour</option>
              <option value="86400">24 Hours</option>
            </select>
          </label>
          <br />

          <button
            type="submit"
            style={{
              background: "white",
              color: "black",
              padding: "4px 10px",
              cursor: "pointer",
              border: "2px solid grey",
            }}
          >
            Encrypt & Store
          </button>
        </form>

        <hr style={{ margin: "20px 0" }} />

        <h1>List Secrets</h1>
        <SecretList secrets={secrets} />

        <FileUploader />
        <FileList files={files} />

        <hr style={{ margin: "40px 0" }} />

        <h3>🚨 Security Audit Logs</h3>
        <div
          style={{
            background: "#f0f0f0",
            padding: "10px",
            fontSize: "12px",
            color: "green",
          }}
        >
          {logs.map((log) => (
            <div
              key={log.id}
              style={{ borderBottom: "1px solid #ccc", padding: "5px 0" }}
            >
              User <strong>{log.ipAddress}</strong> performed{" "}
              <strong>{log.action}</strong> on <strong>{log.entityId}</strong>{" "}
              at {log.createdAt.toLocaleString()}
            </div>
          ))}
          {logs.length === 0 && <div>No security events recorded.</div>}
        </div>
      </div>
    </div>
  );
}
