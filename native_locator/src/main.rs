// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

use std::time::SystemTime;

use crate::logging::LogMessage;

mod common_python;
mod conda;
mod known;
mod logging;
mod messaging;
mod utils;
mod windows_python;

fn main() {
    let now = SystemTime::now();
    logging::log_info("Starting Native Locator");

    struct JsonRPCDispatcher {}
    impl messaging::MessageDispatcher for JsonRPCDispatcher {
        fn send_message<T: serde::Serialize>(&self, message: T) -> () {
            let message = serde_json::to_string(&message).unwrap();
            print!(
                "Content-Length: {}\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n{}",
                message.len(),
                message
            );
        }
        fn log_debug(&self, message: &str) -> () {
            self.send_message(LogMessage::new(
                message.to_string(),
                logging::LogLevel::Debug,
            ));
        }
    }
    let dispatcher = JsonRPCDispatcher {};

    // Finds python on PATH
    common_python::find_and_report(&dispatcher);

    // Finds conda binary and conda environments
    conda::find_and_report(&dispatcher);

    // Finds Windows Store, Known Path, and Registry pythons
    #[cfg(windows)]
    windows_python::find_and_report(&dispatcher);

    match now.elapsed() {
        Ok(elapsed) => {
            logging::log_info(&format!(
                "Native Locator took {} milliseconds.",
                elapsed.as_millis()
            ));
        }
        Err(e) => {
            logging::log_error(&format!("Error getting elapsed time: {:?}", e));
        }
    }

    messaging::send_message(messaging::ExitMessage::new());
}
