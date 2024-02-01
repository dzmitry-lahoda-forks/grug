import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { AdminOptionKind, Client, SigningKey, encodeHex, encodeUtf8 } from "../src";

const artifactDir = path.resolve(__dirname, "../../../artifacts");
const keystoreDir = path.join(os.homedir(), ".cwcli/keys");
const keystorePassword = "123";

const user = "0x9f6de9773b30d62ce431caf26a7fd3f54f06d4071adaf9a8eadfec968bcbf022";
const bank = "0x9ada3b1fca68f9802bcf089fc31c10af1881c684ecc6f5bcdf65df35df0a8ef2";

async function sleep(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

(async function () {
  // load signing key
  const test1 = await SigningKey.fromFile(path.join(keystoreDir, "test1.json"), keystorePassword);
  const signingOpts = {
    sender: user,
    signingKey: test1,
  };

  // create client
  const client = await Client.connect("http://127.0.0.1:26657");

  // store and instantiate token wrapper contract
  const wrapperWasm = fs.readFileSync(path.join(artifactDir, "cw_mock_token_wrapper-aarch64.wasm"));
  const [wrapper, tx1] = await client.storeCodeAndInstantiate(
    wrapperWasm,
    { bank },
    encodeUtf8("wrapper"),
    [],
    AdminOptionKind.SetToNone,
    signingOpts,
  );
  console.log("\nwrapper contract instantiated!");
  console.log("address:", wrapper);
  console.log("txhash:", encodeHex(tx1));

  // wait 2 seconds for tx to settle
  await sleep(2);

  // query the user's balances
  const balancesBefore = await client.queryBalances(user);
  console.log("\nuser balances before wrapping:\n" + JSON.stringify(balancesBefore, null, 2));

  // wrap some tokens
  const tx2 = await client.transfer(
    wrapper,
    [
      {
        denom: "uatom",
        amount: "888",
      },
      {
        denom: "uosmo",
        amount: "999",
      },
    ],
    signingOpts,
  );
  console.log("\ntokens wrapped!");
  console.log("txhash:", encodeHex(tx2));

  // wait 2 seconds for tx to settle
  await sleep(2);

  // query the user's balances again
  const balancesAfter = await client.queryBalances(user);
  console.log("\nuser balances after wrapping\n" + JSON.stringify(balancesAfter, null, 2));
})();
