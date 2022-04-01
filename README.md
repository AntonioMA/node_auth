# Node Auth
Small Node Executable to Implement OpenID Connect authentication with several providers.

## Installation


### Local Installation:
#### Prerequisites:
You'll need:

- NodeJS: https://nodejs.org/. This application is tested and supported on v4 LTS.
  If you use [nvm](https://github.com/creationix/nvm/) to manage your node
  installations (recommended), you can run `nvm use` in the project directory to
  select the right version.
- Redis: http://redis.io.

#### Installation:

TBD

1. You'll need to create and configure a [Google Drive Service Account and Service account key](#google-drive-service-account)
2. Or to create an Hydra client. Assuming you have Hydra running on hydra.public.viam.dev.local:4444
   (which can/should point to localhost) and that you have a nice script to create clients:
```
  ./addClient.sh node_client "http://localhost:8123/login/hydra/callback,http://127.0.0.1:8123/login/hydra/callback" client_secret_post
```
The script will return you the secret. Note that for the script to work you have to have the hydra
executable on the same directory than the addClient.sh script.

3. You'll need to create and configure at least one [authentication provider account](#authenticator-accounts)

After all the prerequisites are ready, execute

```
npm install
```


#### Run local server:

Note: The server and some of the providers (Twitter for example) needs to keep a session to manage
redirects when authenticating. The session is very transient. It requires the environment variable
SESSION_SECRET to be set to any (secret) value:

```
  export SESSION_SECRET="some very secret value goes here"
```

Execute

```
node server
```

Open in browser

```
http://localhost:8123/login/hydra
```

The server can be provided several options. Those are:

```
Usage: node server

  -h, --help                    Displays this help.
  -d, --daemon                  Starts as a daemon.
  -l, --logFile=ARG             Logs output to this file, only if started as a daemon.
  -L, --logLevel=ARG            Desired log level, expressed as a string such as "warn,error"
  -p, --serverPort=ARG          Server listening port. If not present it uses either the PORT env variable or the 8123 port
  -s, --staticPath=ARG          Directory that holds the static files.
  -C, --certDir=ARG             Directory that holds the cert.pem and key.pem files.
  -S, --secure                  Starts as a secure server (HTTPS).
  -o, --allowedCORSOrigins=ARG  Comma separated list of allowed CORS origins
```

### Installing on Heroku

[Heroku] (https://www.heroku.com) is a PaaS (Platform as a Service) that can be used to deploy
simple and small applications for free. To easily deploy this repository to Heroku, sign up for a
Heroku account and click this button:

<a href="https://heroku.com/deploy?template=https://github.com/AntonioMA/node_auth" target="_blank">
  <img src="https://www.herokucdn.com/deploy/button.png" alt="Deploy">
</a>

Heroku will prompt you to specify the shared secret that you wish to use to create projects on that
server.

## Mandatory parameters
Most of the parameters can be defined either by a environment variable or by a Redis key. If both
are defined, the redis key takes precedence.

 1) Valid authenticator providers
   * Environment variable: Not Applicable.
   * Redis key: nodeAuth/Params/authenticator_providers.
   * Description: Comma separated list of authentication providers that you want to use (and
     have been configured, see below.
   * Sample value: `google,twitter,facebook`

## Accounts required
You will need to get and define some developer accounts: One for each of the authentication providers you want to support.


### Authenticator Accounts
#### Hydra (running locally)
0. Add `127.0.0.1 hydra.public.viam.dev.local` to your /etc/hosts file.
1. Create a client id:
```
  ./addClient.sh node_client "http://localhost:8123/login/hydra/callback,http://127.0.0.1:8123/login/hydra/callback"
```
  and take note of the secret returned.
2. Modify the file credTemplates/oidc_creds.json to set the secret you got on the previous step.
3. Execute:
```
node addJSONKey.js -f credTemplates/oidc_creds.json -k nodeAuth/Authenticator/hydra
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 5
4. Add hydra to the nodeAuth/Params/authenticator_providers redis key:
```
redis-cli set nodeAuth/Params/authenticator_providers hydra
```


#### Twitter Sign In
 1. Create an application associated to the your twitter account on https://apps.twitter.com/.
 2. On the application details, you *must* specify a privacy and terms of service URL
 3. On the application permissions page, you must mark the 'Request email addresseses from users' option. You can set the access permissions to 'read only' (since we won't even do that).
 4. As callback URL you *must* set <yourserverBaseURL>/login/twitter/callback where <yourserverOrigin> is the origin (http[s]://someserver.com) for your instance.
 5. Copy the file credTemplates/twitter_creds.json somewhere, and edit it. On the edited file, replace YOUR_KEY_GOES_HERE with the consumerKey and YOUR_SECRET_GOES_HERE with the consumer secret. Save the file.
 6. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/twitter
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 5
 7.  Add twitter to the nodeAuth/Params/authenticator_providers redis key

#### Google Sign In
 1. Create a set of credentials. You will need to create a Proyect First, if you don't have one
    created already. Go to: https://console.developers.google.com/projectcreate, select a
    project name, and a organization.
 2. Go to https://console.developers.google.com/apis/credentials. Select your project on the
    combo on the top of the screen, and press
    'Create Credentials' => OAuth client ID => Configure consent screen
 3. Select Internal o External, depending if you want the app to be used by anyone or just
    internal users. Fill in the required fields then go back to credentials->Create
 4. Select Web Application
 5. On the Authorized Javascript origins, enter the origin for where the node auth test
    page will be served
 6. On the Authorized redirect URIs, enter <yourServerBaseURL>/login/google/callback where <yourServerBaseURL> is the origin for your instance (normally, the same value you entered on step 4).
 7. Press Create.
 8. Copy the file credTemplates/google_creds.json somewhere and edit it. On the edited file, replace YOUR_ID_GOES_HERE with the client ID, and YOUR_SECRET_GOES_HERE with the Client Secret.
 9. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/google
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 7
 9. Go to https://console.developers.google.com/apis/library.
10. Search for Google+ API. Click on it and press Enable.
11. Add google to the nodeAuth/Params/authenticator_providers redis key.

#### Facebook Sign In
 1. Create a facebook app. First go to https://developers.facebook.com and after log in. Press 'Create an app'.
 2. Set name, email and category of the app and press 'Create id for the app'
 3. Press 'Add Product' => Init session with Facebook => press 'start'
 4. On the Authorized redirect URI enter <yourServerBaseURL>/login/facebook/callback where <yourServerBaseURL> is the origin for your instance.
 5. Press save changes
 6. Go to 'App Review' and select Yes as answer of 'Do you want <your App Name> to be a public application?' question.
 7. Confirm your decision
 8. Copy the file credTemplates/facebook_creds.json somewhere and edit it. On the edited file, replace YOUR_ID_GOES_HERE with the aplication ID, and YOUR_SECRET_GOES_HERE with the Aplication Secret Key.
 9. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/facebook
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 8
10. Add facebook to the nodeAuth/Params/authenticator_providers redis key

#### Amazon Sign In
 1. Visit https://developer.amazon.com/lwa/sp/overview.html. You will be asked to login to the
 Developer Console, which handles application registration for Login with Amazon. If this is your
 first time using the Developer Console, you will be asked to set up an account.
 2. Click Create a New Security Profile. This will take you to the Security Profile Management page.
  a. Enter a Name and a Description for your security profile. A security profile associates user
  data and security credentials with one or more related apps. The Name is the name displayed on the
  consent screen when users agree to share information with your application. This name applies to
  Android, iOS, and website versions of your application.
  b. You must enter a Consent Privacy Notice URL for your application now. The Privacy Notice URL is
  the location of your company or application's privacy policy (for example,
  http://www.example.com/privacy.html). This link is displayed to users on the consent screen.
  c. If you want to add a Consent Logo Image for your application, click Upload Image. This logo is
  displayed on the sign-in and consent screen to represent your business or website. The logo will
  be shrunk to 50 pixels in height if it is taller than 50 pixels; there is no limitation on the
  width of the logo.
3. Click Save.
4. Go to the Web Settings of the security profile that you want to use for your app.
5. Click Edit
6. On 'Allowed Return URLs' enter https://<yourServerBaseURL>/login/amazon/callback where
<yourServerBaseURL> is the origin for your instance and press Save
7. Copy the file credTemplate/amazon_creds.json somewhere and edit it. On the edited file,
replace YOUR_ID_GOES_HERE with the aplication ID, and YOUR_SECRET_GOES_HERE with the Aplication
Secret Key.
 9. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/amazon
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 7
10. Add amazon to the nodeAuth/Params/authenticator_providers redis key

#### Microsoft accounts (aka Windows live) Sign In
 1. Register an application with Microsoft at Live connect app management:
 https://apps.dev.microsoft.com
    * Set the name of the app "Your Azure App"
    * Generate a secret (save it, it will be necessary later for replacing YOUR_SECRET_GOES_HERE)
    * Add web plattform, as redirect URL add: https://<yourServerBaseURL>/login/windowslive/callback
    where <yourServerBaseURL> is the origin for your instance and press Create
 2. Copy the file credTemplate/windowslive_creds.json somewhere and edit it. On the edited file,
replace YOUR_ID_GOES_HERE with the aplication ID, and YOUR_SECRET_GOES_HERE with the Aplication
Secret Key.
 3. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/windowslive
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 2
 4. Add windowslive to the nodeAuth/Params/authenticator_providers redis key

#### Yahoo Sign In

 1. Go to https://developer.yahoo.com/oauth/guide/oauth-auth-flow.html#oauth-consumerkey=
 -> My Apps -> Create an App
  * Set the app name
  * choose Web application
  * Set the app description
  * On Callback Domain enter <yourServerBaseURL> where <yourServerBaseURL> is the origin for your instance.
  * On API Permissions check 'Profiles' -> 'Read/Write Public and Private'
  * Click on "Create App"
 2. Copy the file credTemplate/yahoo_creds.json somewhere and edit it. On the edited file,
replace YOUR_ID_GOES_HERE with the aplication ID, and YOUR_SECRET_GOES_HERE with the Aplication
Secret Key.
 3. Execute:
```
node addJSONKey.js -f NAME_OF_THE_SAVED_FILE -k nodeAuth/Authenticator/yahoo
```
where NAME_OF_THE_SAVED_FILE is the name of the file you created on step 2
 4. Add yahoo to the nodeAuth/Params/authenticator_providers redis key

### Batch Script to add authentication and calendar
Another, easier way to create the calendar and authenticator configuration is:
1. On an empty directory copy the [Google Calendar service account](#google-calendar-service-account) as calendar_credentials.json
2. Configure the authenticators you want to use as described on [Authenticator Accounts](#authenticator-accounts) and copy each of the generated files to the same directory. The name of the file must end in `_creds.json` (for example, twitter_creds.json)
3. Once you have all the files, execute:
```
./addProviders.sh directory
```
where directory is the directory with the files. This will load the calendar_credentials.json file,
and configure the nodeAuth/Param/authenticator_providers key automatically.
