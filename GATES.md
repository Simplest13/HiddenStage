# Gates: Required registration username

OWNS: hiddenstage-backend/apps/accounts/serializers.py, hiddenstage-backend/apps/accounts/tests.py, hiddenstage-frontend/src/features/auth/AuthPages.tsx

Scope: Require a valid unique username during account registration across UI and API while keeping username checks aligned.

- [x] G1: Backend rejects missing and invalid registration usernames and accepts a normalized available username.
  CHECK: python manage.py test apps.accounts.tests.RegistrationTests --verbosity 1
  EXPECT: OK
  CWD: hiddenstage-backend
  EVIDENCE: automatic-evidence=v1; definition-sha256=deedd4c392afcabe7e3c5bc47ed4329ca25df926c8a97a040082a8d7eb82cf76; exit=0; EXPECT=matched; output-sha256=b77218c99a863cfbbfd958e5d4ac4440de4f3eb406f40b020880f8a0fe34899c; output-bytes=1868; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\ishik\Desktop\HiddenStagefinal\HiddenStage\hiddenstage-backend; path=4abc986235eb/26 entries

- [x] G2: Frontend TypeScript compiles with required username validation.
  CHECK: npm run typecheck
  EXPECT: > tsc -b
  CWD: hiddenstage-frontend
  EVIDENCE: automatic-evidence=v1; definition-sha256=9c845342df7a54ae531a63ea160770fca46403fd48c7c9a35750685b4b762a4e; exit=0; EXPECT=matched; output-sha256=7793e9a2e3816fd9510a59a616ef1fb60c9647697e6d3b050f92e3323404f3ad; output-bytes=50; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\ishik\Desktop\HiddenStagefinal\HiddenStage\hiddenstage-frontend; path=4abc986235eb/26 entries

