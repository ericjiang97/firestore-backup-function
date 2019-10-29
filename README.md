# Firestore Backup - Firebase Function 

# Requirements
To run you will need Node 8, to use Node 8, recommend using [Node Version Manager](https://github.com/nvm-sh/nvm) and run 

```sh
nvm install 8
nvm use 8
```

# Development
To develop this simply add a `.firebaserc` file with the projectId

```json
{
  "projects": {
    "default": "MY-PROJECT-ID"
  }
}

```

## Installing Dependencies

To install dependencies, simply run `npm install` or `yarn` inside the [functions](,/functions) directory.

# Customisation
You can customise the request

```
firebase functions:config:set backupservice.collections="users,emails"
```

# LICENSE
This repo is licensed under `MIT` and is based off source code in a private repo by [@ericjiang97](https://github.com/ericjiang97)