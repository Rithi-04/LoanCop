import os
import sys
from pathlib import Path

# Add backend directory to sys.path to resolve local imports when run from root
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import shutil
import tempfile
from fastapi.testclient import TestClient
import models
import database
import config
from main import app

# Initialize test client
client = TestClient(app)

def run_tests():
    print("==================================================")
    print("STARTING END-TO-END BACKEND INTEGRATION TESTS")
    print("==================================================")
    
    # Clean up any existing DB and directories to run from a clean state
    if config.DB_PATH.exists():
        try:
            os.remove(config.DB_PATH)
            print(f"Cleaned up existing database '{config.DB_PATH.name}'")
        except Exception as e:
            print(f"Warning: Could not remove database: {e}")
            
    if os.path.exists(config.UPLOAD_DIR):
        try:
            shutil.rmtree(config.UPLOAD_DIR)
            config.UPLOAD_DIR.mkdir(exist_ok=True)
            print("Cleaned up uploads directory")
        except Exception as e:
            print(f"Warning: Could not clear uploads folder: {e}")

    # Explicitly run startup logic to build tables and seed users
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)
    
    # --------------------------------------------------
    # TEST 1: Register and Login Default Users & RBAC
    # --------------------------------------------------
    print("\n--- Test 1: User Registration and Authentication ---")
    
    # Register customer
    reg_cust_resp = client.post("/api/auth/register", json={
        "username": "customer_test",
        "password": "password123",
        "full_name": "Test Customer",
        "email": "test_cust@example.com",
        "role": "Customer"
    })
    assert reg_cust_resp.status_code == 200, f"Customer registration failed: {reg_cust_resp.text}"
    print("Customer registered successfully:", reg_cust_resp.json()["username"])

    # Register officer
    reg_off_resp = client.post("/api/auth/register", json={
        "username": "officer_test",
        "password": "password123",
        "full_name": "Test Officer",
        "email": "test_off@example.com",
        "role": "LoanOfficer"
    })
    assert reg_off_resp.status_code == 200, f"Officer registration failed: {reg_off_resp.text}"
    print("Loan Officer registered successfully:", reg_off_resp.json()["username"])

    # Register manager
    reg_mgr_resp = client.post("/api/auth/register", json={
        "username": "manager_test",
        "password": "password123",
        "full_name": "Test Manager",
        "email": "test_mgr@example.com",
        "role": "Manager"
    })
    assert reg_mgr_resp.status_code == 200, f"Manager registration failed: {reg_mgr_resp.text}"
    print("Manager registered successfully:", reg_mgr_resp.json()["username"])

    # Login as Customer
    login_cust_resp = client.post("/api/auth/login", data={
        "username": "customer_test",
        "password": "password123"
    })
    assert login_cust_resp.status_code == 200, f"Customer login failed: {login_cust_resp.text}"
    cust_token = login_cust_resp.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print("Customer login successful. JWT obtained.")

    # Login as Officer
    login_off_resp = client.post("/api/auth/login", data={
        "username": "officer_test",
        "password": "password123"
    })
    assert login_off_resp.status_code == 200, f"Officer login failed: {login_off_resp.text}"
    off_token = login_off_resp.json()["access_token"]
    off_headers = {"Authorization": f"Bearer {off_token}"}
    print("Officer login successful. JWT obtained.")

    # Login as Manager
    login_mgr_resp = client.post("/api/auth/login", data={
        "username": "manager_test",
        "password": "password123"
    })
    assert login_mgr_resp.status_code == 200, f"Manager login failed: {login_mgr_resp.text}"
    mgr_token = login_mgr_resp.json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    print("Manager login successful. JWT obtained.")

    # Verify current user profile
    me_resp = client.get("/api/auth/me", headers=cust_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "customer_test"
    print("Verified current user identity check.")

    # --------------------------------------------------
    # TEST 2: RBAC Protection Limits
    # --------------------------------------------------
    print("\n--- Test 2: Role-Based Access Control Boundaries ---")
    
    # Customer trying to access officer list route
    blocked_resp = client.get("/api/officer/loans", headers=cust_headers)
    assert blocked_resp.status_code == 403, f"Expected 403 Forbidden, got {blocked_resp.status_code}"
    print("Successfully blocked Customer from Officer resources (HTTP 403).")

    # Customer trying to access manager analytics
    blocked_resp2 = client.get("/api/manager/analytics/stats", headers=cust_headers)
    assert blocked_resp2.status_code == 403, f"Expected 403 Forbidden, got {blocked_resp2.status_code}"
    print("Successfully blocked Customer from Manager resources (HTTP 403).")

    # Officer trying to access manager analytics
    blocked_resp3 = client.get("/api/manager/analytics/stats", headers=off_headers)
    assert blocked_resp3.status_code == 403, f"Expected 403 Forbidden, got {blocked_resp3.status_code}"
    print("Successfully blocked Officer from Manager resources (HTTP 403).")

    # Manager accessing officer list route (Manager inherits Officer roles)
    allowed_resp = client.get("/api/officer/loans", headers=mgr_headers)
    assert allowed_resp.status_code == 200
    print("Verified Manager role inheritance: Manager successfully accessed Officer routes.")

    # --------------------------------------------------
    # TEST 3: Submit Loan Application & Run LangGraph Workflow
    # --------------------------------------------------
    print("\n--- Test 3: Loan Application Submission & LangGraph Trigger ---")
    
    # Submit application as customer
    loan_payload = {
        "amount": 50000.0,
        "purpose": "Home Expansion",
        "annual_income": 65000.0,
        "credit_score": 780,  # Eligible and low risk
        "employment_status": "Employed"
    }
    loan_submit_resp = client.post("/api/customer/loans", json=loan_payload, headers=cust_headers)
    assert loan_submit_resp.status_code == 200, f"Loan submission failed: {loan_submit_resp.text}"
    loan_data = loan_submit_resp.json()
    loan_id = loan_data["id"]
    
    print(f"Loan application #{loan_id} submitted.")
    
    # Assert that Customer response does NOT expose AI details
    assert "ai_decision" not in loan_data
    assert "ai_eligibility_status" not in loan_data
    assert "ai_credit_risk_rating" not in loan_data
    assert "ai_summary" not in loan_data
    assert loan_data["status"] == "Pending"
    print("Verified: Customer endpoint does not expose AI evaluation details.")
    
    # Fetch details as Officer to check the AI-generated results
    officer_detail_resp = client.get(f"/api/officer/loans/{loan_id}", headers=off_headers)
    assert officer_detail_resp.status_code == 200
    officer_loan_data = officer_detail_resp.json()
    
    print(f"AI Decision (verified via officer): {officer_loan_data['ai_decision']}")
    print(f"AI Eligibility (verified via officer): {officer_loan_data['ai_eligibility_status']}")
    print(f"AI Risk Rating (verified via officer): {officer_loan_data['ai_credit_risk_rating']}")
    
    assert officer_loan_data["ai_decision"] == "Approve"
    assert officer_loan_data["ai_eligibility_status"] == "Eligible"
    assert officer_loan_data["ai_credit_risk_rating"] == "Low"

    # --------------------------------------------------
    # TEST 4: Document Upload & AI Re-evaluation
    # --------------------------------------------------
    print("\n--- Test 4: Document Upload & AI Re-run ---")
    
    # Create a temporary dummy file to upload
    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_file:
        temp_file.write(b"Name: Test Customer\nIncome: $65000/year\nPAN: ABCDE1234F\n")
        temp_filepath = temp_file.name

    try:
        with open(temp_filepath, "rb") as f:
            upload_resp = client.post(
                f"/api/customer/loans/{loan_id}/documents",
                headers=cust_headers,
                data={"doc_type": "IncomeProof"},
                files={"file": ("tax_statement.txt", f, "text/plain")}
            )
        assert upload_resp.status_code == 200, f"Document upload failed: {upload_resp.text}"
        doc_info = upload_resp.json()
        print(f"Document uploaded: {doc_info['filename']} (Type: {doc_info['doc_type']})")
    finally:
        os.remove(temp_filepath)

    # Verify document is listed on application detail
    detail_resp = client.get(f"/api/officer/loans/{loan_id}", headers=off_headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert len(detail_data["documents"]) == 1
    assert detail_data["documents"][0]["filename"] == "tax_statement.txt"
    print("Verified document attachment in loan details.")
    
    # Verify AI logs were generated for each agent step
    assert len(detail_data["ai_logs"]) >= 5
    agent_names = [log["agent_name"] for log in detail_data["ai_logs"]]
    print("Verified intermediate AI agent steps logged in DB:")
    for name in agent_names:
        print(f"  - {name}")

    # --------------------------------------------------
    # TEST 5: Customer and Officer RAG Q&A
    # --------------------------------------------------
    print("\n--- Test 5: RAG Chat Queries ---")
    
    # Customer chat
    cust_chat_resp = client.post("/api/customer/chat", json={"message": "What interest rates apply to first-time buyers?"}, headers=cust_headers)
    assert cust_chat_resp.status_code == 200
    print("Customer Chat Answer:", cust_chat_resp.json()["answer"][:80], "...")

    # Officer chat
    off_chat_resp = client.post("/api/officer/chat", json={"message": "Query internal risk guidelines regarding LTI limitations"}, headers=off_headers)
    assert off_chat_resp.status_code == 200
    print("Officer Chat Answer:", off_chat_resp.json()["answer"][:80], "...")

    # --------------------------------------------------
    # TEST 6: Officer Manual Decisions and Overrides
    # --------------------------------------------------
    print("\n--- Test 6: Officer Decisions & AI Recommendation Overrides ---")
    
    # Submit decision matching AI recommendation (Approve -> Approved)
    match_payload = {
        "status": "Approved",
        "reason": "Customer meets all requirements; strong credit rating."
    }
    decision_resp = client.post(f"/api/officer/loans/{loan_id}/decision", json=match_payload, headers=off_headers)
    assert decision_resp.status_code == 200
    assert decision_resp.json()["status"] == "Approved"
    print(f"Officer matched AI decision. Status set to: {decision_resp.json()['status']}")

    # Submit a second loan application where AI recommends "Reject" to test "Override"
    reject_loan_payload = {
        "amount": 80000.0,
        "purpose": "Business Venture",
        "annual_income": 15000.0,
        "credit_score": 520,  # Below 600
        "employment_status": "Employed"
    }
    loan_submit_resp2 = client.post("/api/customer/loans", json=reject_loan_payload, headers=cust_headers)
    loan_id2 = loan_submit_resp2.json()["id"]
    
    # Assert that Customer response does NOT expose AI decision details
    assert "ai_decision" not in loan_submit_resp2.json()
    
    # Fetch details as Officer to check the AI decision
    officer_detail_resp2 = client.get(f"/api/officer/loans/{loan_id2}", headers=off_headers)
    assert officer_detail_resp2.status_code == 200
    officer_loan_data2 = officer_detail_resp2.json()
    print(f"Submitted loan #{loan_id2} (Poor credit: 520). AI decision (verified via officer): {officer_loan_data2['ai_decision']}")
    assert officer_loan_data2["ai_decision"] == "Reject"

    # Officer overrides "Reject" with "Approved" without override reason (Should fail)
    bad_override = {
        "status": "Approved",
        "reason": "Customer is personal friend."
    }
    bad_resp = client.post(f"/api/officer/loans/{loan_id2}/decision", json=bad_override, headers=off_headers)
    assert bad_resp.status_code == 400
    print("Blocked attempt to override AI recommendation without an override reason.")

    # Officer overrides with override reason (Should succeed)
    good_override = {
        "status": "Approved",
        "reason": "Approved based on co-signer with 800 credit rating.",
        "override_reason": "Exception requested due to solid co-signer backing."
    }
    good_resp = client.post(f"/api/officer/loans/{loan_id2}/decision", json=good_override, headers=off_headers)
    assert good_resp.status_code == 200
    assert good_resp.json()["status"] == "Approved"
    assert good_resp.json()["override_reason"] == "Exception requested due to solid co-signer backing."
    print("Successfully logged officer override with justification.")

    # --------------------------------------------------
    # TEST 7: Manager Analytics & Audit Logs
    # --------------------------------------------------
    print("\n--- Test 7: Manager Analytics and Audit Logs ---")
    
    # Get general loan statistics
    stats_resp = client.get("/api/manager/analytics/stats", headers=mgr_headers)
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()
    print("Manager Stats:")
    print(f"  - Total Applications: {stats_data['total_applications']}")
    print(f"  - Approved: {stats_data['approved_applications']}")
    print(f"  - Rejected: {stats_data['rejected_applications']}")
    print(f"  - Total Approved Amount: {stats_data['total_approved_amount']}")
    assert stats_data["total_applications"] == 2
    assert stats_data["approved_applications"] == 2

    # Get AI performance metrics
    ai_perf_resp = client.get("/api/manager/analytics/ai-performance", headers=mgr_headers)
    assert ai_perf_resp.status_code == 200
    perf_data = ai_perf_resp.json()
    print("AI Performance Metrics:")
    print(f"  - Total Evaluated by AI: {perf_data['total_evaluated_by_ai']}")
    print(f"  - Officer Override Count: {perf_data['override_count']}")
    print(f"  - Agreement Count: {perf_data['agreement_count']}")
    print(f"  - Agreement Rate: {perf_data['agreement_rate'] * 100:.1f}%")
    print(f"  - Avg Processing Time: {perf_data['average_processing_time_seconds']:.2f}s")
    assert perf_data["total_evaluated_by_ai"] == 2
    assert perf_data["override_count"] == 1
    assert perf_data["agreement_count"] == 1

    # Get audit history
    audit_resp = client.get("/api/manager/audit-logs", headers=mgr_headers)
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    print(f"Retrieved {len(audits)} system audit logs.")
    assert len(audits) >= 4
    
    print("\n==================================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
