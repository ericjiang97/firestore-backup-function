import * as functions from "firebase-functions";
import moment from "moment";
import axios from "axios";
import { google } from "googleapis";
import { FirestoreRequestBodyType } from "./types/FirestoreRequestBodyType";

exports.backup = functions.https.onRequest(async (req, res) => {
  /**
   * `process.env.GCLOUD_PROJECT`: Provides the Firebase project ID
   */
  const projectId = process.env.GCLOUD_PROJECT;

  /**
   * `process.env.FIREBASE_CONFIG`: Provides the Firebase CONFIG
   */
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/datastore"],
    keyFilename: `./keyfiles/${projectId}`,
    projectId
  });

  const accessTokenResponse = await auth.getAccessToken();
  const accessToken = accessTokenResponse.token;

  if (!accessToken || !accessTokenResponse) {
    return res
      .status(500)
      .send(
        `Invalid Access Token. Service Account may not have valid authorization`
      );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `"Bearer ${accessToken}`
  };

  /**
   * Backups to the storage bucket
   */

  //TODO: use firebase.config() and default to the gs://${projectId}-backup if value is null
  const outputUriPrefix = `gs://${projectId}-backup`;
  if (!(outputUriPrefix && outputUriPrefix.indexOf("gs://") == 0)) {
    return res
      .status(500)
      .send(`Malformed outputUriPrefix: ${outputUriPrefix}`);
  }

  // Construct a backup path folder based on the timestamp
  const timestamp = moment().format();
  let path = outputUriPrefix;
  if (path.endsWith("/")) {
    path += timestamp;
  } else {
    path += "/" + timestamp;
  }

  const body: FirestoreRequestBodyType = {
    outputUriPrefix: path
  };

  /**
   * Collections to backup
   */
  // TODO: use firebase.config()
  const collectionParam = ["users"];
  if (collectionParam) {
    body.collectionIds = collectionParam;
  }
  const url = `https://firestore.googleapis.com/v1beta1/projects/${projectId}/databases/(default):exportDocuments`;
  try {
    const response = await axios.post(url, body, { headers: headers });
    return res
      .status(200)
      .send(response.data)
      .end();
  } catch (e) {
    if (e.response) {
      console.warn(e.response.data);
    }

    return res
      .status(500)
      .send(`Could not start backup: ${e}`)
      .end();
  }
});
