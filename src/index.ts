import { Request, Response } from "express";
import moment from "moment";
import axios from "axios";
import { google } from "googleapis";
import { FirestoreRequestBodyType } from "./types/FirestoreRequestBodyType";

exports.backup = async (req: Request, res: Response) => {
  /**
   * `process.env.GCP_PROJECT`: Provides the Firebase project ID
   */
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  const auth = new google.auth.JWT({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  });

  const tokens = await auth.authorize();

  if (!tokens) {
    return res
      .status(500)
      .send(`Invalid Access Token. Account may not have valid authorization`);
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `"Bearer ${tokens.access_token}`
  };

  /**
   * Backups to the storage bucket
   */

  //TODO: use firebase.config() and default to the gs://${projectId}-backup if value is null
  const gsBucket = `gs://${projectId}-backup`;
  if (!(gsBucket && gsBucket.indexOf("gs://") == 0)) {
    return res.status(500).send(`Malformed gsBucket: ${gsBucket}`);
  }

  // Construct a backup path folder based on the timestamp
  const timestamp = moment().toISOString();
  const outputUriPrefix = `${gsBucket}/${timestamp}`;

  const body: FirestoreRequestBodyType = {
    outputUriPrefix
  };

  /**
   * Collections to backup
   */
  const collectionParam = ["users"];
  if (collectionParam) {
    body.collectionIds = collectionParam;
  }
  const url = `https://firestore.googleapis.com/v1beta2/projects/${projectId}/databases/(default):exportDocuments?access_token=${tokens.access_token}`;
  try {
    const response = await axios.post(url, body, { headers });
    return res.status(200).send(response.data);
  } catch (e) {
    if (e.response) {
      console.warn(e.response.data);
    }

    return res.status(500).send(`Could not start backup: ${e}`);
  }
  return res.status(200).send("hello");
};
