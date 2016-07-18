# TOCAT Chrome Extension
## Synopsis
TOCAT chrome extension - extension for associating tasks on the different issue tracking,  project management and etc systems with some kind of data from TOCAT. 

## Getting Started
To get you started you can simply clone this repository and install the dependencies:
```sh
git clone https://github.com/opsway/tocat-chrome-extension.git
cd tocat-chrome-extension
npm i
```

## Run the Application

For building extension we use  ```gulp```
```sh
gulp default
```
or simply
```sh
gulp
```
the same task with tracking changes in project and autobuilding
```sh
gulp watch
```

## Publish changes

### Set version
Set according to project version in `manifest.json` file
### Compress project
Create .zip archive with added key. Use task
```sh
gulp compress --keyPath=/path_to_key.pem
```
### Upload archive to Developer dashboard in Chrome web store
Upload our just created archive to Chrome web store. Visit [Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
If you have right permissions choose in selectbox OpsWay (tocat-chrome-extension) group(1) then press edit button in our menu of active extension(2)
![alt tag](http://i.imgur.com/A6j5lM4.png)

Then you can see smth like that ![alt tag](http://i.imgur.com/JGWmFgw.png) Upload here(3) our archived project, then in the bottom of this page press publish changes(4) button.
![alt tag](http://i.imgur.com/xdvSitD.png)