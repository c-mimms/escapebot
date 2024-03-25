## Overview
This project is a proof of concept LLM exploration tool created during the initial release of the OpenAI API. The LLM is given arbitrary goals by the user, which it attempts to achieve by cycling through the following stages though, hypothesis, reflection, action. 
The LLM has the ability to run arbitrary commands on the command line in order to achieve the given goal.

Note: This application currently requires Node.js version 18 or higher.

## Instructions
1. Run `npm install`
2. Rename `.env.example` to `.env` and add your OpenAI key
3. Run `node index.js`
