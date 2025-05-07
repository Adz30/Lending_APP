import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";
import { ethers } from "ethers";
import { updateLoanStatus } from "../store/reducers/VaultA";

import Alert from "./Alert";
import {
  repayIntoVaultA,
  loadVaultBalances,
  loadRepaymentAmount,
} from "../store/interactions";

const RepayLoan = () => {
  const [amount, setAmount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const token = useSelector((state) => state.tokens.contracts[0]);
  const symbol = useSelector((state) => state.tokens.symbols[0]);
  const balance = useSelector((state) => state.tokens.balances[0]);

  const VAULT_A = useSelector((state) => state.vaultA.VAULT_A);
  const repaymentAmount = useSelector((state) => state.vaultA.repaymentAmount);
  const vaultABalance = useSelector((state) => state.vaultA.vaultABalance);
  const isRepaying = useSelector((state) => state.vaultA.repaying.isRepaying);
  const isRepaySuccess = useSelector((state) => state.vaultA.repaying.isSuccess);
  const transactionHash = useSelector(
    (state) => state.vaultA.repaying.transactionHash
  );

  const loanHistory = useSelector((state) => state.vaultA.loanHistory);
  const dispatch = useDispatch();

  // Load repayment amount from mapping
  useEffect(() => {
    if (account && VAULT_A && provider) {
      loadRepaymentAmount(VAULT_A, account, dispatch);
    }
  }, [account, VAULT_A, provider, dispatch]);

  // Autofill the input field with repaymentAmount if it's the initial value
  useEffect(() => {
    if (repaymentAmount && amount === 0) {
      setAmount(repaymentAmount);
    }
  }, [repaymentAmount]);

  const repaymentHandler = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    const parsedAmount = ethers.utils.parseUnits(amount.toString(), "ether");

    try {
      await repayIntoVaultA(provider, VAULT_A, token, parsedAmount, dispatch);
      await loadVaultBalances(VAULT_A, provider, dispatch);

      // Assuming you know the loanId or some way to identify the loan
      const loanId = account; // Replace with actual loan identifier
      dispatch(updateLoanStatus({ loanId, newStatus: "paid" })); // Update loan status to "paid"

      setShowAlert(true);
    } catch (error) {
      console.error("Repayment failed:", error);
      setShowAlert(true);
    }
  };

  return (
    <>
      {account ? (
        <Form onSubmit={repaymentHandler}>
          <Row>
            <Form.Text className="d-flex justify-content-center align-items-center" muted>
              Repay loan plus interest
            </Form.Text>
            <Form.Text className="text-end my-2" muted>
              vaultABalance: {vaultABalance}
            </Form.Text>
            <Form.Text className="text-end my-2" muted>
              Balance: {balance}
            </Form.Text>
            <Form.Text className="text-end my-2" muted>
              Repayment Due: {repaymentAmount ? `${repaymentAmount} ${symbol}` : "Loading..."}
            </Form.Text>
            <InputGroup>
              <Form.Control
                type="number"
                placeholder="0.0"
                min="0.0"
                step="any"
                id="amount"
                onChange={(e) => setAmount(e.target.value)}
                value={amount === 0 ? "" : amount}
              />
              <InputGroup.Text
                style={{ width: "100px" }}
                className="justify-content-center"
              >
                {symbol}
              </InputGroup.Text>
            </InputGroup>
          </Row>

          <Row className="my-3">
            {isRepaying ? (
              <Spinner
                animation="border"
                style={{ display: "block", margin: "0 auto" }}
              />
            ) : (
              <Button type="submit">Repay</Button>
            )}
          </Row>
        </Form>
      ) : (
        <p
          className="d-flex justify-content-center align-items-center"
          style={{ height: "300px" }}
        >
          Please connect wallet.
        </p>
      )}

      {isRepaying ? (
        <Alert
          message={"Repayment Pending..."}
          transactionHash={null}
          variant={"info"}
          setShowAlert={setShowAlert}
        />
      ) : isRepaySuccess && showAlert ? (
        <Alert
          message={"Repayment Successful"}
          transactionHash={transactionHash}
          variant={"success"}
          setShowAlert={setShowAlert}
        />
      ) : !isRepaySuccess && showAlert ? (
        <Alert
          message={"Repayment Failed"}
          transactionHash={null}
          variant={"danger"}
          setShowAlert={setShowAlert}
        />
      ) : null}
    </>
  );
};

export default RepayLoan;
