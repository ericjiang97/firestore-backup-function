import * as functions from "firebase-functions";
import moment from "moment";
import axios from "axios";
import { google } from "googleapis";
import { FirestoreRequestBodyType } from "./types/FirestoreRequestBodyType";
import {
  GOOGLE_API_CLIENT_AUTH_SCOPES,
  REST_CONTENT_TYPE_JSON
} from "./constants";

const config = functions.config();

const backup_collections = config.collections.split(",") || ["users"];

console.log(process.env.FIREBASE_CONFIG);

exports.backup = functions.https.onRequest(async (req, res) => {
  /**
   * `process.env.GCLOUD_PROJECT`: Provides the Firebase project ID
   */
  const projectId = process.env.GCLOUD_PROJECT;

  /**
   * `process.env.FIREBASE_CONFIG`: Provides the Firebase CONFIG
   */
  const auth = await google.auth.getClient({
    scopes: GOOGLE_API_CLIENT_AUTH_SCOPES,
    projectId
  });

  const accessTokenResponse = await auth.getAccessToken();
  const accessToken = accessTokenResponse.token;

  console.log(accessToken, accessTokenResponse);

  if (!accessToken || !accessTokenResponse) {
    return res
      .status(500)
      .send(`Invalid Access Token. Account may not have valid authorization`);
  }

  const headers = {
    "Content-Type": REST_CONTENT_TYPE_JSON,
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
  const collectionParam = backup_collections;
  if (collectionParam) {
    body.collectionIds = collectionParam;
  }
  const url = `https://firestore.googleapis.com/v1beta1/projects/${projectId}/databases/(default):exportDocuments`;
  try {
    const response = await axios.post(url, body, { headers });
    return res.status(200).send(response.data);
  } catch (e) {
    if (e.response) {
      console.warn(e.response.data);
    }

    return res.status(500).send(`Could not start backup: ${e}`);
  }
});
