# Hubot needs node to run.
FROM node:18

ENV HUBOT_NAME "hubot"
ENV HUBOT_OWNER "hubot"
ENV HUBOT_DESCRIPTION "hubot"
EXPOSE ${EXPOSE}
 
# Create a user to run Hubot as.
RUN useradd hubot -m
COPY . /home/hubot
RUN chown -R hubot:hubot /home/hubot
 
USER hubot
WORKDIR /home/hubot
RUN npm install
 
# Set a default command to run Hubot!
CMD npm start