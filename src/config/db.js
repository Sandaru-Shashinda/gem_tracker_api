import mongoose from "mongoose"
import dns from "dns"
import dotenv from "dotenv"

dotenv.config()

// A mongodb+srv:// URI makes the driver do an SRV lookup, and Node runs those
// through c-ares, which keeps its own nameserver list instead of using the OS
// resolver. On some Windows setups that list comes back as loopback only, where
// nothing is listening, so every lookup dies with `querySrv ECONNREFUSED` even
// though normal name resolution works fine. Retry once against public
// resolvers; DNS_SERVERS overrides them.
const FALLBACK_DNS = (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const srvHost = (uri) => uri.match(/^mongodb\+srv:\/\/(?:[^@]*@)?([^/?,]+)/)?.[1]

// Resolves the SRV record up front so a broken resolver can be swapped out
// before the driver ever sees it.
const ensureSrvResolvable = async (uri) => {
  const host = srvHost(uri)
  if (!host) return

  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`)
    return
  } catch (error) {
    const previous = dns.getServers()
    console.warn(
      `SRV lookup for ${host} failed via ${previous.join(", ") || "no resolver"} (${error.code}); ` +
        `retrying with ${FALLBACK_DNS.join(", ")}`,
    )
    dns.setServers(FALLBACK_DNS)
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`)
  }
}

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/gem-tracker"

  try {
    await ensureSrvResolvable(uri)
    const conn = await mongoose.connect(uri)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEOUT" || error.code === "ESERVFAIL") {
      console.error(
        "DNS could not resolve the cluster. Check your network, or set DNS_SERVERS in .env to a reachable DNS server.",
      )
    }
    process.exit(1)
  }
}

export default connectDB
