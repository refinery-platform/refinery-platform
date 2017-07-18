FROM ubuntu:16.04

MAINTAINER Troy M. Connor
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Install packages
RUN apt-get update && apt-get -y install wget \
    curl \
    git \
    zip \
    unzip \
    libxml2-dev \
    build-essential \
    software-properties-common \
    libssl-dev \
    python \
    python-dev \
    python-pip \
    python-virtualenv \
    vim \
    jq \
    coreutils \
    openssh-client


# Clean apt
RUN apt-get clean 

#&& mkdir root/n && curl -L https://git.io/n-install | sh -s -- -y
COPY bin/n /usr/local/bin/n 

CMD ["/bin/sh"]
