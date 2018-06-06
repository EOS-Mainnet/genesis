FROM node:8

WORKDIR /build

# install tools and dependencies
RUN apt-get update && \
        apt-get install -y \
        g++ \
        build-essential \
        curl \
        git \
        file \
        binutils \
        libssl-dev \
        pkg-config \
        libudev-dev \
        mysql-client

# install rustup
#RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# rustup directory
#ENV PATH /root/.cargo/bin:$PATH

# show backtraces
#ENV RUST_BACKTRACE 1

# show tools
#RUN rustc -vV && \
#cargo -V && \
#gcc -v &&\
#g++ -v

# build parity
#RUN git clone https://github.com/paritytech/parity.git
#RUN cd parity && \
#        cargo build --release --verbose && \
#        ls /build/parity/target/release/parity && \
#        strip /build/parity/target/release/parity

#ENV PATH /build/parity/target/release:$PATH

# build genesis
RUN mkdir genesis
WORKDIR /build/genesis
ADD . /build/genesis
RUN npm install -g lerna
RUN npm install
RUN cp docker/config.js .

EXPOSE 8080 8545 8180
#ENTRYPOINT ["node snapshot.js --load_config"]
