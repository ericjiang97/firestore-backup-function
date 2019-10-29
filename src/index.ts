import { Request, Response } from "express";
import moment from "moment";
import axios from "axios";
import { google } from "googleapis";
import { FirestoreRequestBodyType } from "./types/FirestoreRequestBodyType";
import {
  GOOGLE_API_CLIENT_AUTH_SCOPES,
  REST_CONTENT_TYPE_JSON
} from "./constants";

console.log(process.env.FIREBASE_CONFIG);

exports.backup = async (req: Request, res: Response) => {
  /**
   * `process.env.GCLOUD_PROJECT`: Provides the Firebase project ID
   */
  const projectId = process.env.GCLOUD_PROJECT;

  const auth = await google.auth.getClient({
    scopes: GOOGLE_API_CLIENT_AUTH_SCOPES,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
  const collectionParam = ["users"];
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
};
