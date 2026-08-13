import React, { createContext, useCallback, useState } from "react";

const ModalContext = createContext(null);

const EMPTY_MODAL = {
  isOpen: false,
  type: "",
  message: "",
  showInput: false,
  inputValue: "",
  inputType: "text",
  onConfirm: null,
  onCancel: null
};

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(EMPTY_MODAL);

  const close = useCallback(() => setModal(EMPTY_MODAL), []);

  const showAlert = useCallback(
    (message) => {
      setModal({ ...EMPTY_MODAL, isOpen: true, type: "alert", message, onConfirm: close });
    },
    [close]
  );

  const showConfirm = useCallback(
    (message, onConfirmCallback) => {
      setModal({
        ...EMPTY_MODAL,
        isOpen: true,
        type: "confirm",
        message,
        onConfirm: () => {
          close();
          onConfirmCallback();
        },
        onCancel: close
      });
    },
    [close]
  );

  const showPrompt = useCallback(
    (message, onConfirmCallback, options = {}) => {
      setModal({
        ...EMPTY_MODAL,
        isOpen: true,
        type: "prompt",
        message,
        showInput: true,
        inputType: options.type || "text",
        onConfirm: (val) => {
          close();
          onConfirmCallback(val);
        },
        onCancel: close
      });
    },
    [close]
  );

  const setInputValue = useCallback((val) => {
    setModal((prev) => ({ ...prev, inputValue: val }));
  }, []);

  const value = { modal, showAlert, showConfirm, showPrompt, setInputValue };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export default ModalContext;
